# Real Estate Contract Center (RECC) - Demo

> An interactive dashboard for visualizing commercial real estate contract data with geographic mapping

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

---

## 🎯 Overview

This is a portfolio demonstration project showcasing a modern web application for managing and visualizing commercial real estate contracts. The dashboard features interactive 3D globe visualization, charts, and comprehensive contract management capabilities.

**⚠️ Note:** This repository contains a demonstration version with entirely synthetic data. No real contract information is included.

---

## ✨ Features

### Current Implementation
- **Interactive 3D Globe Visualization** - View properties worldwide using globe.gl
- **Multiple Map Views** - Switch between Mapbox 2D, 3D point markers, and 3D hexagon views
- **Dashboard Analytics** - Summary cards showing portfolio metrics
- **Data Visualization** - Pie and bar charts for regional and property type distribution
- **Contract Details** - Detailed modal views for each property
- **Responsive Design** - Material-UI components for clean, modern interface
- **Mock API Backend** - Express server with synthetic data for demonstration

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser

### Installation

```bash
# Clone the repository
git clone https://github.com/kylepmoynihan/contract-center-demo.git
cd contract-center-demo

# Install dependencies
npm install

# Start the backend API server (Terminal 1)
node src/backend/api/server.js

# Start the frontend dev server (Terminal 2)
npm run dev

# Open browser to http://localhost:3000
```

The dashboard will load with 20 synthetic lease contracts distributed globally.

---

## 📁 Project Structure

```
contract-center-demo/
├── src/
│   ├── frontend/
│   │   ├── App.jsx              # Main dashboard component
│   │   ├── GlobeView.jsx        # 3D globe with point markers
│   │   ├── GlobeViewHex.jsx     # 3D globe with hexagon markers
│   │   ├── MapboxView.jsx       # 2D Mapbox integration
│   │   ├── index.html           # HTML entry point
│   │   ├── main.jsx             # React bootstrap
│   │   └── index.css            # Global styles
│   └── backend/
│       └── api/
│           └── server.js        # Express API with mock data
├── data/
│   └── synthetic-leases.csv     # Sample data in spreadsheet format
├── package.json
├── vite.config.js
└── README.md
```

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Material-UI (MUI)** - Component library and design system
- **globe.gl** - 3D globe visualization using Three.js/WebGL
- **Mapbox GL JS** - 2D map visualization
- **Recharts** - Charts for data visualization
- **Axios** - HTTP client for API calls
- **Vite** - Build tool and dev server

### Backend
- **Express** - Web server framework
- **Node.js** - JavaScript runtime
- **CORS** - Cross-origin resource sharing

---

## 📊 Demo Data

The application includes 20 synthetic lease contracts with:
- **Geographic Distribution**: Americas (7), Asia Pacific (10), Europe (3)
- **Property Types**: Office, Lab/R&D, Factory, Distribution, Warehouse
- **Data Points**: Property name, address, coordinates, square footage, rent, lease terms, landlord info

All data is completely fictional and generated for demonstration purposes only.

---

## 🎨 Features Showcase

### Dashboard Views
- **Summary Cards**: Total leases, annual rent, total space, average price per sqft
- **3D Globe**: Interactive globe with property locations
- **Regional Charts**: Pie chart showing distribution by region
- **Property Type Chart**: Bar chart showing types of properties
- **Contract Cards Grid**: Browse all leases with key details
- **Detail Modal**: Click any property for comprehensive information

### Map Interaction
- **Toggle Views**: Switch between Mapbox 2D, 3D points, and 3D hexagons
- **Hover Tooltips**: See key metrics on hover
- **Click Details**: Click markers to view full contract details
- **Rotation**: 3D globe rotates automatically (can be controlled)

---

## 🔧 Configuration

### Port Configuration

The application uses two ports:
- **Frontend**: `http://localhost:3000` (Vite dev server)
- **Backend**: `http://localhost:3001` (Express API)

To change ports, edit `vite.config.js`:

```javascript
server: {
  port: 3000,  // Change frontend port here
  proxy: {
    '/api': {
      target: 'http://localhost:3001',  // Backend port
    },
  },
}
```

---

## 📝 API Endpoints

The mock backend provides these endpoints:

- `GET /api/contracts` - Returns all contracts
- `GET /api/contracts/:id` - Returns specific contract
- `GET /api/stats` - Returns aggregated statistics
- `GET /api/health` - Health check

---

## 🎓 Learning Points

This project demonstrates:
- React hooks (useState, useEffect) for state management
- Integration with multiple mapping libraries
- RESTful API design and consumption
- Material-UI theming and component usage
- Data visualization with charts
- Responsive design principles
- Modern JavaScript (ES6+)
- Vite for fast development

---

## 🤝 Contributing

This is a portfolio/demonstration project. Feel free to fork and adapt for your own purposes under the MIT license.

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙋 Author

**Kyle Moynihan**

This project was created as a portfolio demonstration of full-stack development skills including React, Node.js, data visualization, and geographic mapping.

---

## 🔮 Potential Enhancements

Future iterations could include:
- PostgreSQL database integration
- User authentication (AWS Cognito)
- PDF document storage (AWS S3)
- CSV import functionality
- Export to Excel/PDF
- Advanced filtering and search
- Multi-tenant architecture
- AI-powered contract analysis
- Mobile responsive improvements

---

## 📸 Screenshots

*Screenshots would go here showing the dashboard, globe view, and contract details*

---

**Built with ❤️ using React, Node.js, and modern web technologies**
