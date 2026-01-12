// Contract Management Lambda Function
// Handles CRUD operations for contracts with comprehensive error handling

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Initialize AWS services
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const bedrock = new AWS.BedrockRuntime({ region: 'us-east-1' });
const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Database connection pool
let dbPool;

// Get database credentials from Secrets Manager
async function getDbCredentials() {
    const command = new GetSecretValueCommand({
        SecretId: process.env.DB_SECRET_ARN
    });

    const response = await secretsManager.send(command);
    return JSON.parse(response.SecretString);
}

// Initialize database connection
async function initializeDb() {
    if (!dbPool) {
        const credentials = await getDbCredentials();
        dbPool = new Pool({
            host: process.env.DB_ENDPOINT,
            port: 5432,
            database: 'recc',
            user: credentials.username,
            password: credentials.password,
            ssl: { rejectUnauthorized: false },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        });
    }
    return dbPool;
}

// Main Lambda handler
exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        const pool = await initializeDb();
        const { httpMethod, path, body, queryStringParameters, requestContext } = event;
        const userId = requestContext.authorizer.claims.sub;
        const userEmail = requestContext.authorizer.claims.email;

        // Route based on HTTP method and path
        let response;

        switch (`${httpMethod} ${path}`) {
            case 'GET /contracts':
                response = await listContracts(pool, queryStringParameters);
                break;

            case 'GET /contracts/{id}':
                response = await getContract(pool, event.pathParameters.id);
                break;

            case 'POST /contracts':
                response = await createContract(pool, JSON.parse(body), userId, userEmail);
                break;

            case 'PUT /contracts/{id}':
                response = await updateContract(pool, event.pathParameters.id, JSON.parse(body), userId);
                break;

            case 'DELETE /contracts/{id}':
                response = await deleteContract(pool, event.pathParameters.id, userId);
                break;

            case 'POST /contracts/search':
                response = await semanticSearch(pool, JSON.parse(body));
                break;

            case 'GET /contracts/{id}/summary':
                response = await generateSummary(pool, event.pathParameters.id);
                break;

            default:
                response = {
                    statusCode: 404,
                    body: JSON.stringify({ error: 'Route not found' })
                };
        }

        // Add CORS headers
        return {
            ...response,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        console.error('Error:', error);

        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// List contracts with pagination and filtering
async function listContracts(pool, params = {}) {
    const {
        limit = 20,
        offset = 0,
        status = 'active',
        propertyType,
        sortBy = 'created_at',
        sortOrder = 'DESC'
    } = params;

    let query = `
        SELECT
            c.*,
            ST_AsGeoJSON(location) as location_geojson,
            (SELECT SUM(total_monthly_cost) FROM financial_details WHERE contract_id = c.id) as total_cost
        FROM contracts c
        WHERE status = $1
    `;

    const queryParams = [status];
    let paramIndex = 2;

    if (propertyType) {
        query += ` AND property_type = $${paramIndex}`;
        queryParams.push(propertyType);
        paramIndex++;
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    const countQuery = `
        SELECT COUNT(*) FROM contracts
        WHERE status = $1 ${propertyType ? 'AND property_type = $2' : ''}
    `;
    const countParams = propertyType ? [status, propertyType] : [status];
    const countResult = await pool.query(countQuery, countParams);

    return {
        statusCode: 200,
        body: JSON.stringify({
            contracts: result.rows.map(formatContract),
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        })
    };
}

// Get single contract
async function getContract(pool, contractId) {
    const query = `
        SELECT
            c.*,
            ST_AsGeoJSON(location) as location_geojson,
            json_agg(
                json_build_object(
                    'year', fd.year,
                    'month', fd.month,
                    'base_rent', fd.base_rent,
                    'total_monthly_cost', fd.total_monthly_cost
                )
            ) as financial_history
        FROM contracts c
        LEFT JOIN financial_details fd ON c.id = fd.contract_id
        WHERE c.id = $1
        GROUP BY c.id
    `;

    const result = await pool.query(query, [contractId]);

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Contract not found' })
        };
    }

    // Get document from S3 if exists
    const contract = formatContract(result.rows[0]);

    if (contract.s3_document_path) {
        const signedUrl = await getSignedUrl(contract.s3_document_path);
        contract.documentUrl = signedUrl;
    }

    return {
        statusCode: 200,
        body: JSON.stringify(contract)
    };
}

// Create new contract
async function createContract(pool, contractData, userId, userEmail) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Geocode address if not provided
        const location = contractData.location || await geocodeAddress(contractData.address);

        // Insert contract
        const insertQuery = `
            INSERT INTO contracts (
                contract_number, property_name, property_type, address, location,
                landlord_info, tenant_info, lease_start_date, lease_end_date,
                total_square_feet, price_per_sqft, monthly_rent, annual_rent,
                escalation_terms, renewal_options, critical_dates,
                created_by, status
            ) VALUES (
                $1, $2, $3, $4, ST_GeomFromGeoJSON($5),
                $6, $7, $8, $9,
                $10, $11, $12, $13,
                $14, $15, $16,
                $17, $18
            ) RETURNING *
        `;

        const values = [
            contractData.contractNumber,
            contractData.propertyName,
            contractData.propertyType,
            JSON.stringify(contractData.address),
            JSON.stringify({
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
            }),
            JSON.stringify(contractData.landlordInfo || {}),
            JSON.stringify(contractData.tenantInfo || {}),
            contractData.leaseStartDate,
            contractData.leaseEndDate,
            contractData.totalSquareFeet,
            contractData.pricePerSqft,
            contractData.monthlyRent,
            contractData.annualRent,
            JSON.stringify(contractData.escalationTerms || {}),
            JSON.stringify(contractData.renewalOptions || {}),
            JSON.stringify(contractData.criticalDates || {}),
            userEmail,
            'active'
        ];

        const result = await client.query(insertQuery, values);
        const newContract = result.rows[0];

        // Insert initial financial details
        if (contractData.financialDetails) {
            await insertFinancialDetails(client, newContract.id, contractData.financialDetails);
        }

        // Log audit event
        await logAuditEvent('CREATE_CONTRACT', newContract.id, userId, {
            contractNumber: contractData.contractNumber,
            propertyName: contractData.propertyName
        });

        await client.query('COMMIT');

        // Update search index asynchronously
        updateSearchIndex(newContract).catch(console.error);

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Contract created successfully',
                contract: formatContract(newContract)
            })
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Update contract
async function updateContract(pool, contractId, updates, userId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'property_name', 'property_type', 'address', 'landlord_info',
            'tenant_info', 'lease_start_date', 'lease_end_date',
            'total_square_feet', 'price_per_sqft', 'monthly_rent', 'annual_rent',
            'escalation_terms', 'renewal_options', 'critical_dates', 'status'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                if (['address', 'landlord_info', 'tenant_info', 'escalation_terms', 'renewal_options', 'critical_dates'].includes(field)) {
                    updateFields.push(`${field} = $${paramIndex}::jsonb`);
                    values.push(JSON.stringify(updates[field]));
                } else {
                    updateFields.push(`${field} = $${paramIndex}`);
                    values.push(updates[field]);
                }
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No valid fields to update' })
            };
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(contractId);

        const updateQuery = `
            UPDATE contracts
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await client.query(updateQuery, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Contract not found' })
            };
        }

        // Log audit event
        await logAuditEvent('UPDATE_CONTRACT', contractId, userId, updates);

        await client.query('COMMIT');

        // Update search index asynchronously
        updateSearchIndex(result.rows[0]).catch(console.error);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Contract updated successfully',
                contract: formatContract(result.rows[0])
            })
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Delete contract (soft delete)
async function deleteContract(pool, contractId, userId) {
    const query = `
        UPDATE contracts
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status != 'deleted'
        RETURNING id, contract_number, property_name
    `;

    const result = await pool.query(query, [contractId]);

    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Contract not found or already deleted' })
        };
    }

    // Log audit event
    await logAuditEvent('DELETE_CONTRACT', contractId, userId, result.rows[0]);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Contract deleted successfully',
            contract: result.rows[0]
        })
    };
}

// Semantic search using Bedrock
async function semanticSearch(pool, searchParams) {
    const { query, filters = {} } = searchParams;

    // Generate embeddings for the query
    const embeddingResponse = await bedrock.invokeModel({
        modelId: 'amazon.titan-embed-text-v1',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            inputText: query
        })
    }).promise();

    const embedding = JSON.parse(embeddingResponse.body.toString()).embedding;

    // Build SQL query with vector similarity search
    let sqlQuery = `
        SELECT
            c.*,
            ST_AsGeoJSON(location) as location_geojson,
            1 - (c.embedding <=> $1::vector) as similarity
        FROM contracts c
        WHERE status = 'active'
    `;

    const queryParams = [JSON.stringify(embedding)];
    let paramIndex = 2;

    // Apply filters
    if (filters.propertyType) {
        sqlQuery += ` AND property_type = $${paramIndex}`;
        queryParams.push(filters.propertyType);
        paramIndex++;
    }

    if (filters.minPrice) {
        sqlQuery += ` AND price_per_sqft >= $${paramIndex}`;
        queryParams.push(filters.minPrice);
        paramIndex++;
    }

    if (filters.maxPrice) {
        sqlQuery += ` AND price_per_sqft <= $${paramIndex}`;
        queryParams.push(filters.maxPrice);
        paramIndex++;
    }

    sqlQuery += ` ORDER BY similarity DESC LIMIT 20`;

    const result = await pool.query(sqlQuery, queryParams);

    // Enhance results with Bedrock Claude
    const enhancedResults = await enhanceSearchResults(result.rows, query);

    return {
        statusCode: 200,
        body: JSON.stringify({
            query,
            results: enhancedResults,
            totalResults: result.rows.length
        })
    };
}

// Generate contract summary using Bedrock
async function generateSummary(pool, contractId) {
    const contract = await getContractData(pool, contractId);

    if (!contract) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Contract not found' })
        };
    }

    // Prepare prompt for Bedrock Claude
    const prompt = `
        Generate a comprehensive 3-page summary of this commercial real estate contract:

        Property: ${contract.property_name}
        Address: ${JSON.stringify(contract.address)}
        Lease Period: ${contract.lease_start_date} to ${contract.lease_end_date}
        Total Square Feet: ${contract.total_square_feet}
        Monthly Rent: $${contract.monthly_rent}
        Annual Rent: $${contract.annual_rent}
        Price per Sqft: $${contract.price_per_sqft}

        Critical Dates: ${JSON.stringify(contract.critical_dates)}
        Escalation Terms: ${JSON.stringify(contract.escalation_terms)}
        Renewal Options: ${JSON.stringify(contract.renewal_options)}

        Please provide:
        1. Executive Summary (1 paragraph)
        2. Key Financial Terms
        3. Important Dates and Deadlines
        4. Renewal and Termination Provisions
        5. Risk Assessment
        6. Recommendations
    `;

    const response = await bedrock.invokeModel({
        modelId: 'anthropic.claude-v2',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
            max_tokens_to_sample: 2000,
            temperature: 0.3
        })
    }).promise();

    const summary = JSON.parse(response.body.toString()).completion;

    // Save summary to S3
    const summaryKey = `summaries/${contractId}/summary-${Date.now()}.txt`;
    await s3.putObject({
        Bucket: process.env.DOCUMENTS_BUCKET,
        Key: summaryKey,
        Body: summary,
        ContentType: 'text/plain',
        Metadata: {
            contractId,
            generatedAt: new Date().toISOString()
        }
    }).promise();

    // Update contract with summary path
    await pool.query(
        'UPDATE contracts SET s3_summary_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [summaryKey, contractId]
    );

    return {
        statusCode: 200,
        body: JSON.stringify({
            contractId,
            summary,
            summaryUrl: await getSignedUrl(summaryKey)
        })
    };
}

// Helper functions
function formatContract(contract) {
    if (contract.location_geojson) {
        contract.location = JSON.parse(contract.location_geojson);
        delete contract.location_geojson;
    }

    // Parse JSONB fields
    ['address', 'landlord_info', 'tenant_info', 'escalation_terms', 'renewal_options', 'critical_dates'].forEach(field => {
        if (typeof contract[field] === 'string') {
            try {
                contract[field] = JSON.parse(contract[field]);
            } catch (e) {
                console.warn(`Failed to parse ${field}:`, e);
            }
        }
    });

    return contract;
}

async function geocodeAddress(address) {
    // Implementation would use Amazon Location Service or similar
    // Placeholder for demonstration
    return {
        latitude: 37.7749,
        longitude: -122.4194
    };
}

async function getSignedUrl(s3Key, expiresIn = 3600) {
    return s3.getSignedUrlPromise('getObject', {
        Bucket: process.env.DOCUMENTS_BUCKET,
        Key: s3Key,
        Expires: expiresIn
    });
}

async function updateSearchIndex(contract) {
    // Update OpenSearch index
    // Implementation would use OpenSearch client
    console.log('Updating search index for contract:', contract.id);
}

async function enhanceSearchResults(results, query) {
    const prompt = `
        Based on the search query "${query}", provide a brief summary of these contract search results:
        ${JSON.stringify(results.slice(0, 5).map(r => ({
            property_name: r.property_name,
            address: r.address,
            monthly_rent: r.monthly_rent,
            price_per_sqft: r.price_per_sqft
        })))}
    `;

    const response = await bedrock.invokeModel({
        modelId: 'anthropic.claude-instant-v1',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
            max_tokens_to_sample: 500,
            temperature: 0.3
        })
    }).promise();

    const enhancement = JSON.parse(response.body.toString()).completion;

    return {
        summary: enhancement,
        contracts: results.map(formatContract)
    };
}

async function logAuditEvent(action, resourceId, userId, details) {
    await dynamodb.put({
        TableName: process.env.AUDIT_TABLE,
        Item: {
            id: uuidv4(),
            timestamp: Date.now(),
            action,
            resourceId,
            userId,
            details,
            ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year retention
        }
    }).promise();
}

async function insertFinancialDetails(client, contractId, financialDetails) {
    const insertQuery = `
        INSERT INTO financial_details (
            contract_id, year, month, base_rent, operating_expenses,
            utilities, property_tax, insurance, total_monthly_cost, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    for (const detail of financialDetails) {
        await client.query(insertQuery, [
            contractId,
            detail.year,
            detail.month,
            detail.baseRent,
            detail.operatingExpenses || 0,
            detail.utilities || 0,
            detail.propertyTax || 0,
            detail.insurance || 0,
            detail.totalMonthlyCost,
            detail.currency || 'USD'
        ]);
    }
}

async function getContractData(pool, contractId) {
    const query = 'SELECT * FROM contracts WHERE id = $1';
    const result = await pool.query(query, [contractId]);
    return result.rows[0] || null;
}