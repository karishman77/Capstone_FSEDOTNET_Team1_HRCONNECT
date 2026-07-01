# HRConnect - Employee & Leave Management System

A comprehensive Employee & Leave Management System built with ASP.NET Core, React, and PostgreSQL.

## Project Overview

HRConnect is a full-stack web application that enables:
- Employee management with profiles and records
- Leave request workflow and approval system
- Leave balance tracking
- Admin dashboard for HR operations
- JWT-based authentication

## Tech Stack

### Backend
- **Framework**: ASP.NET Core 10
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: JWT Bearer Tokens
- **Password Security**: BCrypt
- **Testing**: xUnit + Moq

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Routing**: React Router v6

## Getting Started

### Prerequisites
- .NET 10 SDK
- Node.js 18+
- PostgreSQL 12+ (or Docker)
- Visual Studio Code or Visual Studio 2022

### Database Setup

#### Option 1: Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

This will start PostgreSQL on `localhost:5432` with credentials:
- Username: `postgres`
- Password: `postgres`
- Database: `hrconnect_db`

#### Option 2: Local PostgreSQL Installation
```bash
# Create database
createdb -U postgres hrconnect_db
```

Update the connection string in `HRConnect.API/appsettings.json` if needed.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd HRConnect.API
```

2. Restore dependencies:
```bash
dotnet restore
```

3. Create and apply migrations:
```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

4. Run the API:
```bash
dotnet run
```

The API will start on `http://localhost:5000`

**Admin Credentials:**
- Email: `admin@example.com`
- Password: `Admin@123`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd hrconnect-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/{id}` - Get employee by ID
- `GET /api/employees?name=...&department=...` - Search employees
- `POST /api/employees` - Create new employee (Admin only)
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee (Admin only)

### Leave Requests
- `GET /api/leaves` - Get all leave requests (Admin only)
- `GET /api/leaves/{id}` - Get leave request by ID
- `GET /api/leaves/mine` - Get user's leave requests
- `GET /api/leaves/employee/{employeeId}` - Get employee's leave requests
- `GET /api/leaves/{employeeId}/balances` - Get leave balances
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/{id}/status` - Update leave status (Admin only)
- `PUT /api/leaves/{id}/cancel` - Cancel leave request

## Project Structure

```
HRConnect/
├── HRConnect.API/                 # Backend API
│   ├── Controllers/               # API endpoints
│   ├── Services/                  # Business logic
│   ├── Repositories/              # Data access layer
│   ├── Models/                    # Domain entities
│   ├── DTOs/                      # Data transfer objects
│   ├── Data/                      # Database context
│   ├── Validators/                # Validation logic
│   ├── Program.cs                 # Entry point
│   └── appsettings.json          # Configuration
│
├── HRConnect.Tests/               # Unit tests
│
├── hrconnect-ui/                  # Frontend React app
│   ├── src/
│   │   ├── components/            # Reusable components
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API integration
│   │   ├── context/               # React context
│   │   ├── types/                 # TypeScript types
│   │   ├── App.tsx                # Main app component
│   │   └── main.tsx               # Entry point
│   ├── public/                    # Static assets
│   └── vite.config.ts             # Vite configuration
│
├── docker-compose.yml             # PostgreSQL setup
└── README.md                      # This file
```

## Features Implemented

### Sprint 1: Setup & Core Module
- ✅ Project structure and configuration
- ✅ Database models and relationships
- ✅ Entity Framework Core migrations
- ✅ API controllers and services

### Sprint 2: Authentication & Workflows
- ✅ JWT-based authentication
- ✅ User registration and login
- ✅ Leave request creation and management
- ✅ Admin approval workflow

### Sprint 3: Admin & Testing
- ✅ Admin dashboard
- ✅ Leave balance tracking
- ✅ Employee search and filtering
- ✅ Unit tests (4/4 passing)

## Testing

### Backend Unit Tests
```bash
cd HRConnect.Tests
dotnet test
```

### API Testing
Use Swagger UI at `http://localhost:5000/swagger` to test endpoints, or import the API into Postman.

## Configuration

### JWT Settings
Edit `appsettings.json` to customize:
```json
"Jwt": {
  "SecretKey": "your-secret-key-change-in-production",
  "Issuer": "HRConnect.API",
  "Audience": "HRConnect.UI",
  "ExpirationMinutes": 10080
}
```

### Database Connection
Modify the connection string in `appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=hrconnect_db;Username=postgres;Password=postgres"
}
```

## Deployment

### Local Deployment
The project is configured for localhost development.

### Production Deployment
1. Update `appsettings.json` with production database connection
2. Set JWT SecretKey to a strong random value
3. Build frontend: `npm run build`
4. Publish backend: `dotnet publish -c Release`
5. Deploy to your hosting platform

## Performance & NFRs

- API response time: < 1s (on localhost)
- Page load time: < 5s (on localhost)
- Database: PostgreSQL with proper indexing
- Authentication: BCrypt password hashing
- Error handling: Consistent JSON error responses

## Development Guidelines

### Code Style
- Follow C# naming conventions (PascalCase for classes, camelCase for variables)
- Use TypeScript for frontend components
- Write self-documenting code with meaningful names

### Git Workflow
1. Create feature branches: `git checkout -b feature/feature-name`
2. Commit with clear messages
3. Submit pull requests for review
4. Merge to main after approval

### SOLID Principles
- **S**ingle Responsibility: Each service handles one concern
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes are substitutable
- **I**nterface Segregation: Small, focused interfaces
- **D**ependency Inversion: Depend on abstractions

## Known Limitations

- Role-based access control is simplified (admin flag only)
- SMTP configuration is optional; if not configured, email notifications are logged instead of sent
- Multi-level approval is simplified to Manager Approved → Final Approved

## Future Enhancements

- [x] Email notifications on leave approval/rejection
- [x] Leave utilization analytics dashboard
- [x] Employee search with advanced filters
- [x] Export leave reports as Excel
- [x] Multi-level approval workflow
- [x] Leave carry-forward policy
- [x] User profile management

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `docker ps`
- Check connection string in `appsettings.json`
- Verify database exists: `psql -U postgres -l`

### Frontend API Connection Issues
- Ensure backend is running on port 5000
- Check CORS configuration in `Program.cs`
- Verify proxy settings in `vite.config.ts`

### JWT Token Issues
- Clear browser localStorage
- Regenerate token by logging in again
- Check JWT secret key matches in configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues and questions, please open a GitHub issue or contact the development team.

## License

This project is part of a certification program and is provided as-is for educational purposes.

## Acknowledgments

- Built as a capstone project for full-stack development certification
- Uses industry-standard technologies and best practices
- Designed for learning and demonstrating enterprise application development skills
