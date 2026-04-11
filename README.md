# Medical POS System

## About the Project

A comprehensive, full-featured Point of Sale (POS) system designed specifically for medical stores, pharmacies, and clinics. This application offers a robust set of tools to manage daily operations, including inventory and stock tracking, sales processing, customer and supplier management, and comprehensive automated reporting. The user interface is built around a professional, medical-themed design system, ensuring an accessible, intuitive, and highly responsive user experience across different screen sizes.

By combining modern web technologies with native desktop application capabilities, it operates gracefully offline with local database storage, automatic daily backups, and direct hardware integrations like USB barcode scanners and thermal receipt printers. Whether acting as a standalone checkout terminal or part of a broader local architecture, this POS system simplifies complex pharmacy workflows into efficient, manageable tasks.

## How to Run Locally 

If you have cloned the project from GitHub and want to run it on your system for development, you'll need **Node.js** (v18.18.0 or higher) installed on your operating system.

Here are the step-by-step instructions to get the application running:

1. **Install Dependencies**  
   Open your terminal inside the cloned project directory and run:
   ```bash
   npm install
   ```
   This will install all required dependencies for the frontend (Angular), backend (Express), and the desktop wrapper (Electron). *Note: Native database modules like `better-sqlite3` will automatically rebuild for your system architecture during the post-install phase.*

2. **Initialize the Database**  
   Run the following command once to set up the local SQLite database schema and generate the initial default user:
   ```bash
   npm run init-db
   ```
   *Default Login Credentials:*
   - **Email:** `test@store.com`
   - **Password:** `TestPass123` 
   *(Note: Please change this password from Settings → Security after your first login)*

3. **Start the Application**  
   To spin up the development environment—which concurrently starts the local Express REST API, the Angular renderer, and the Electron desktop window—run:
   ```bash
   npm run dev
   ```

## Creating Executables (.exe and .deb)

To convert this development project into production-ready executable files for installation on end-user machines, the application uses `electron-builder`.

Depending on your target operating system, run the respective command below. The resulting executable files will be generated inside the `release` folder located at the root of the project.

**For Windows (.exe):**
```bash
npm run build-win
```
*This command bundles the Angular frontend and backend processes, then packages them into a standard Windows NSIS installer (`.exe`).*

**For Linux (.deb / AppImage):**
```bash
npm run build-linux
```
*This command compiles and packages the application into both an `.AppImage` (portable executable) and a `.deb` Debian package file.*

## Architecture and Technology Stack

### Application Architecture
The application uses a hybrid approach, combining a Client-Server web model wrapped seamlessly inside an Electron desktop app to provide a persistent local installation:
- **Renderer Process (Frontend):** Handles all visual layouts, user interactions, and view states using a Single Page Application (SPA) architecture. It communicates with the local API server via standard HTTP RESTful requests.
- **Main Process (Desktop Layer):** Electron manages the native desktop integration, application windows, file system access, and hardware interaction. It isolates the renderer UI from lower-level APIs to enhance application security (Strict Context Isolation).
- **Local API Server (Backend):** A standalone Node.js Express server boots alongside your Electron app in the background. It executes core business logic, issues JWT-based authentication tokens, and performs direct queries against the database.
- **Embedded Database:** Employs a local, file-based SQLite database. Storing data entirely structure-side removes the need for an active internet connection or complex external database configurations. 

### Technology Stack
- **Frontend Stack:** Angular 17, Material Design components, Chart.js (for data visualization), SCSS (for the custom medical design system), and TypeScript.
- **Backend Stack:** Node.js runtime, Express web framework, bcryptjs (for strict password hashing), and JSON Web Tokens (JWT) for secure session handling.
- **Database:** SQLite via the `better-sqlite3` library, offering high-performance, synchronous data reads/writes directly to the local filesystem (`data/medical_pos.sqlite`).
- **Desktop Wrapper:** Electron and `electron-builder` for final packaging.
