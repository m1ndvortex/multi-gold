# Jewelry SaaS Platform

A comprehensive multi-tenant SaaS platform designed for Persian-speaking jewelers to manage their business operations.

## Features

- **Multi-tenant Architecture**: Isolated data and customization per tenant
- **Persian/RTL Support**: Full right-to-left language support
- **Inventory Management**: Track jewelry items, gold prices, and stock levels
- **Customer Management**: Manage customer information and purchase history
- **Order Processing**: Handle custom orders and repairs
- **Financial Tracking**: Monitor sales, expenses, and profitability
- **User Management**: Role-based access control
- **Real-time Gold Prices**: Integration with gold price APIs

## Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express.js** for API framework
- **Prisma** as ORM with **MySQL** database
- **Redis** for caching and sessions
- **JWT** for authentication
- **Docker** for containerization

### Frontend
- **React 18** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Query** for server state
- **React Router** for navigation

### Infrastructure
- **Docker Compose** for development environment
- **Nginx** as reverse proxy
- **MySQL 8.0** database
- **Redis 7** for caching

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- npm or yarn

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jewelry-saas-platform
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Or run locally**
   ```bash
   # Install dependencies
   npm install
   cd backend && npm install
   cd ../frontend && npm install

   # Start services
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers

### API Endpoints

The API will be available at `http://localhost:3001/api/v1`

- `GET /health` - Health check endpoint
- `POST /api/v1/auth/login` - User authentication
- More endpoints will be documented as they are implemented

### Frontend

The frontend will be available at `http://localhost:3000`

## Project Structure

```
jewelry-saas-platform/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── config/         # Database and Redis configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Main server file
│   ├── prisma/             # Database schema and migrations
│   └── Dockerfile
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── Dockerfile
├── docker/                 # Docker configuration
│   ├── nginx/              # Nginx configuration
│   └── mysql/              # MySQL initialization
└── docker-compose.yml      # Docker Compose configuration
```

## Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Follow the established folder structure
- Use conventional commit messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.