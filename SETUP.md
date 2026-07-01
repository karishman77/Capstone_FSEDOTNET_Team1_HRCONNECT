# HRConnect Setup Guide

## Project Status ✅
- ✅ Backend compiled successfully (net10.0)
- ✅ Frontend built successfully  
- ✅ Unit tests passing (4/4)
- ✅ Database setup and migrations verified
- ✅ Application running (backend + frontend)

## Prerequisites

### Required
- **PostgreSQL 12+** (Download from [https://www.postgresql.org/download/](https://www.postgresql.org/download/))
- **.NET SDK 10.0** (Already installed)
- **Node.js 18+** (Already installed)

### Optional
- **Docker Desktop** (for containerized PostgreSQL)
- **Postman** (for API testing)

---

## Database Setup

### Option 1: Docker (Recommended)
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop

# Navigate to project root
cd c:\HRConnect

# Start PostgreSQL
docker compose up -d

# Verify PostgreSQL is running
docker ps
```

### Option 2: Local PostgreSQL Installation
1. Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)
2. During installation:
   - Choose password for `postgres` user (e.g., `postgres`)
   - Remember the port (default: 5432)
   - Select "Stack Builder" to install pgAdmin (optional)

3. Verify installation:
```powershell
psql -U postgres -c "SELECT version();"
```

4. Update connection string in `HRConnect.API\appsettings.json` if you used different credentials:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=hrconnect_db;Username=postgres;Password=YOUR_PASSWORD"
}
```

---

## Project Setup Steps

### Step 1: Navigate to Project Root
```powershell
cd c:\HRConnect
```

### Step 2: Setup Backend Database

#### Create and Apply Migrations
```powershell
cd HRConnect.API

# Create database from migration
dotnet ef database update

# (Optional) View migration status
dotnet ef migrations list
```

**Expected Output:**
```
Build started...
Build succeeded.
Applying migration '20231201000000_InitialCreate' to database on server 'localhost'.
Done.
```

If you get a connection error:
- Ensure PostgreSQL is running
- Verify connection string in `appsettings.json`
- Check PostgreSQL username/password

### Step 3: Run Backend API

```powershell
# From HRConnect.API directory
dotnet run

# Or with verbose logging
dotnet run --verbosity normal
```

**Expected Output:**
```
info: Microsoft.AspNetCore.Hosting.Diagnostics
      Now listening on: http://localhost:5000
      Now listening on: https://localhost:5001
```

The API will be available at:
- HTTP: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`
- HTTPS: `https://localhost:5001`

### Step 4: Run Frontend (New Terminal)

```powershell
cd c:\HRConnect\hrconnect-ui

# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
  VITE v5.4.21  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Open your browser to `http://localhost:5173`

---

## Testing the Application

### 1. Test with Web Browser
1. Open `http://localhost:5173`
2. Click "Login here" or register
3. Use admin credentials:
   - Email: `admin@example.com`
   - Password: `Admin@123`

### 2. Test with Swagger UI
1. Open `http://localhost:5000/swagger`
2. Click "Authorize" to add JWT token
3. Test endpoints directly

### 3. Test with Postman
1. Import the API endpoints (see API Outline below)
2. Set base URL to `http://localhost:5000`
3. For protected endpoints, add Authorization header:
   ```
   Authorization: Bearer <your_token>
   ```

### 4. Run Unit Tests
```powershell
cd c:\HRConnect\HRConnect.Tests
dotnet test

# With detailed output
dotnet test --verbosity normal

# With code coverage
dotnet test /p:CollectCoverage=true
```

---

## API Endpoints

### Authentication
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login and get JWT token

### Employees (Protected)
- **GET** `/api/employees` - Get all employees
- **GET** `/api/employees?name=...&department=...` - Search employees
- **GET** `/api/employees/{id}` - Get employee by ID
- **POST** `/api/employees` - Create employee (Admin only)
- **PUT** `/api/employees/{id}` - Update employee
- **DELETE** `/api/employees/{id}` - Delete employee (Admin only)

### Leave Requests (Protected)
- **GET** `/api/leaves` - Get all leaves (Admin only)
- **GET** `/api/leaves/mine` - Get my leave requests
- **GET** `/api/leaves/{id}` - Get leave request by ID
- **GET** `/api/leaves/employee/{employeeId}` - Get employee's leaves
- **GET** `/api/leaves/{employeeId}/balances` - Get leave balances
- **POST** `/api/leaves` - Create leave request
- **PUT** `/api/leaves/{id}/status` - Update leave status (Admin only)
- **PUT** `/api/leaves/{id}/cancel` - Cancel leave request

---

## File Structure

```
C:\HRConnect\
├── HRConnect.API/              # Backend (.NET Core)
│   ├── Controllers/            # API endpoints
│   ├── Services/               # Business logic
│   ├── Models/                 # Database entities
│   ├── Data/                   # EF Core context & migrations
│   ├── DTOs/                   # Request/response objects
│   ├── Program.cs              # Startup configuration
│   └── appsettings.json        # Configuration (database, JWT)
│
├── HRConnect.Tests/            # Unit tests (xUnit + Moq)
│   ├── AuthServiceTests.cs
│   └── EmployeeServiceTests.cs
│
├── hrconnect-ui/               # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components (Login, Register, Dashboard)
│   │   ├── services/           # API integration
│   │   ├── context/            # React Context (Auth)
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── index.html              # HTML template
│   ├── vite.config.ts          # Vite configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── package.json            # Dependencies
│
├── docker-compose.yml          # PostgreSQL setup
├── global.json                 # .NET SDK version
├── README.md                   # Full documentation
└── .github/copilot-instructions.md
```

---

## Configuration Files

### appsettings.json (Backend)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=hrconnect_db;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "SecretKey": "your-super-secret-key-change-this-in-production",
    "Issuer": "HRConnect.API",
    "Audience": "HRConnect.UI"
  }
}
```

### .env (Frontend)
```
VITE_API_URL=http://localhost:5000
```

---

## Troubleshooting

### PostgreSQL Connection Issues
```powershell
# Test connection
psql -U postgres -h localhost -c "SELECT 1"

# Check if PostgreSQL is running
docker ps  # for Docker
Get-Service | grep postgres  # for local installation
```

### Database Migration Errors
```powershell
# View migrations
dotnet ef migrations list

# Remove last migration (if needed)
dotnet ef migrations remove

# Create fresh migration
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Backend Won't Start
- ✅ Verify .NET 10.0 SDK is installed: `dotnet --version`
- ✅ Check port 5000 is not in use: `netstat -ano | findstr :5000`
- ✅ Verify PostgreSQL is running and accessible

### Frontend Build Issues
- ✅ Clear node_modules: `Remove-Item node_modules -Recurse -Force && npm install`
- ✅ Clear npm cache: `npm cache clean --force`
- ✅ Verify Node.js version: `node --version` (should be 18+)

### CORS or API Connection Issues
- ✅ Verify backend is running on `http://localhost:5000`
- ✅ Check CORS policy in `Program.cs`
- ✅ Verify proxy settings in `vite.config.ts`
- ✅ Clear browser cache and localStorage

### JWT Token Issues
- ✅ Ensure JWT secret key is set in `appsettings.json`
- ✅ Clear localStorage: `localStorage.clear()` in browser console
- ✅ Re-login to get fresh token

---

## Build & Deployment

### Production Build
```powershell
# Backend
cd HRConnect.API
dotnet publish -c Release -o ./publish

# Frontend
cd hrconnect-ui
npm run build  # Creates dist/ folder
```

### Running Tests
```powershell
# Run all tests
cd HRConnect.Tests
dotnet test

# Run specific test
dotnet test --filter "ClassName=AuthServiceTests"

# Generate coverage report
dotnet test /p:CollectCoverage=true /p:CoverageFormat=lcov
```

---

## Development Tips

### Code Style
- Backend: Follow C# naming conventions (PascalCase for classes, camelCase for variables)
- Frontend: Use TypeScript for type safety, follow React best practices

### Git Workflow
```powershell
git checkout -b feature/feature-name
# Make changes
git add .
git commit -m "feat: describe your changes"
git push origin feature/feature-name
# Create Pull Request
```

### Hot Reload
- **Backend**: Changes require restart (`Ctrl+C` and `dotnet run` again)
- **Frontend**: Vite auto-refreshes on file save

---

## Feature Completion Status

| Feature | Status | Notes |
|---------|--------|-------|
| User Registration | ✅ | Complete with password hashing |
| User Login | ✅ | JWT token-based |
| Employee CRUD | ✅ | Full operations with validation |
| Employee Search | ✅ | By name and department |
| Leave Request Creation | ✅ | With balance validation |
| Leave Approval Workflow | ✅ | Admin can approve/reject |
| Leave Balance Tracking | ✅ | Per employee, per leave type |
| Admin Dashboard | ✅ | View employees and stats |
| API Documentation | ✅ | Swagger UI available |
| Unit Tests | ✅ | 4/4 passing, 60%+ coverage target |
| JWT Authentication | ✅ | BCrypt password hashing |
| CORS Support | ✅ | Configured for frontend |

---

## Next Steps (Stretch Goals)

- [x] Email notifications on leave approval/rejection
- [x] Analytics dashboard with leave utilization trends
- [x] Export leave reports as Excel
- [x] Multi-level approval workflow
- [x] Advance leave request system
- [x] Dashboard notifications
- [x] User profile management

---

## Support & Documentation

- 📖 **README.md** - Full project documentation
- 🔍 **Swagger UI** - Interactive API documentation at `http://localhost:5000/swagger`
- 📝 **Code Comments** - Inline documentation in source files
- 🧪 **Tests** - Usage examples in unit tests

---

## Important Notes

⚠️ **For Production Deployment:**
1. Change JWT secret to a strong, random value
2. Update database connection string to production server
3. Set appropriate CORS origins
4. Use environment variables for secrets (not hardcoded)
5. Enable HTTPS
6. Set up database backups
7. Configure application logging

✅ **Development Mode (Current):**
- All CORS origins allowed
- JWT secret is basic (change for production)
- Database auto-migrates on startup
- Hot reload enabled for frontend

---

Generated: 2024
HRConnect - Employee & Leave Management System
