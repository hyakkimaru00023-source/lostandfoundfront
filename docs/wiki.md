# Project Summary
The Lost & Found AI system is an innovative platform that leverages advanced AI technology, specifically YOLOv8m for object detection, to facilitate the recovery of lost items. This application enables users to easily report lost and found items while providing a comprehensive claims management system for administrators. With a user-friendly interface, responsive design, and detailed analytics, it streamlines the recovery process for both users and administrators, enhancing the overall experience of item recovery.

# Project Module Description
The application consists of several functional modules:
- **Homepage**: Displays a hero section and statistics dashboard.
- **AI Object Detection**: Utilizes YOLOv8m for smart item matching.
- **Item Reporting**: Allows users to report lost or found items with image uploads.
- **Search and Filtering**: Provides advanced capabilities for users to find items quickly.
- **Admin Dashboard**: Enhanced with claims management features, including:
  - **Claims Dashboard**: View and filter all claims.
  - **Status Tracking**: Monitor the status of claims.
  - **Bulk Actions**: Approve or reject multiple claims efficiently.
  - **Detailed Views**: Access complete claim information.
- **Smart Matching**: AI suggestions for potential claim matches.
- **Dispute Resolution**: Automated workflow for conflicting claims.
- **Analytics & Management**: Performance metrics and user management.

# Directory Tree
```
.
├── README.md                   # Project overview and setup instructions
├── components.json             # Component configurations
├── eslint.config.js            # ESLint configuration file
├── index.html                  # Main HTML file for the application
├── lost-found-ai-system.tar.gz  # Compressed project resources
├── package.json                # Project dependencies and scripts
├── postcss.config.js           # PostCSS configuration file
├── public                      # Public assets like favicon and robots.txt
│   ├── favicon.svg
│   └── robots.txt
├── src                         # Main source code of the application
│   ├── App.css
│   ├── App.tsx                 # Updated main application file
│   ├── components              # UI components for the application
│   │   ├── ClaimsManagement.tsx # New claims management interface
│   │   ├── ImageUpload.tsx      # Component for image uploads
│   │   └── ItemCard.tsx         # Component for displaying items
│   ├── hooks                   # Custom hooks
│   ├── lib                     # Utility functions and storage
│   ├── pages                   # Different pages of the application
│   │   ├── AdminDashboard.tsx   # Enhanced admin interface
│   │   └── Index.tsx            # Main landing page
│   ├── services                # API service files
│   │   ├── claimsService.ts     # Claims processing logic
│   │   ├── datasetManager.ts     # Manages datasets for AI
│   │   └── similarityService.ts   # Handles similarity checks
│   ├── types                   # TypeScript types
│   │   └── claims.ts           # Claims data structures
│   ├── vite-env.d.ts           # Vite environment types
│   └── main.tsx                # Entry point for the application
├── tailwind.config.ts          # Tailwind CSS configuration
├── vite.config.ts              # Vite configuration file
└── uploads                     # Directory for uploaded files
```

# File Description Inventory
- **README.md**: Contains project details and setup instructions.
- **index.html**: Main entry point for the web application.
- **src/**: Contains all source code, including components, pages, and services.
- **public/**: Hosts static files like images and configuration for web crawlers.
- **uploads/**: Directory for uploaded project resources and training data.

# Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js (for service interactions)
- **AI**: YOLOv8m for object detection
- **Build Tools**: Vite, PostCSS, ESLint

# Usage
1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies using the package manager.
4. Run linting to ensure code quality.
5. Build the project for production.
