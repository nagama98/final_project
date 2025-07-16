# ElastiBank Loan Management System

## Overview

ElastiBank is a comprehensive loan management system that combines traditional banking operations with modern AI-powered features. The system provides loan officers and managers with tools to process loan applications, manage customer relationships, handle document processing, and leverage AI-driven insights through Elasticsearch and OpenAI integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The application follows a monorepo structure with clear separation between client and server code:

- **Frontend**: React-based SPA with TypeScript, using Vite for build tooling
- **Backend**: Express.js REST API with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Search Engine**: Elasticsearch for document search and hybrid search capabilities
- **AI Integration**: OpenAI for embeddings and chat completions (RAG system)

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Search**: Elasticsearch with hybrid search capabilities
- **AI**: OpenAI API (embeddings + chat completions)
- **State Management**: TanStack Query for server state
- **File Upload**: Multer for document handling
- **Session Management**: PostgreSQL-based sessions

## Key Components

### Database Schema
The system uses four main entities:
- **Users**: Customer and staff management with role-based access
- **Loan Applications**: Core loan processing with status tracking
- **Documents**: File management with text extraction and embeddings
- **Chat Messages**: AI conversation history

### Frontend Architecture
- **Component Library**: Custom shadcn/ui components with Tailwind CSS
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state synchronization
- **UI Pattern**: Dashboard-centric design with sidebar navigation

### Backend Services
- **Storage Service**: Abstracted data layer with in-memory fallback
- **Elasticsearch Service**: Document indexing and hybrid search
- **OpenAI Service**: Embedding generation and chat completions
- **RAG Service**: Retrieval-Augmented Generation for contextual AI responses

## Data Flow

### Loan Application Process
1. Applications created through frontend forms
2. Documents uploaded and processed (text extraction + embeddings)
3. Applications indexed in Elasticsearch for search
4. Status updates tracked through database

### AI-Powered Search
1. User queries processed through hybrid search (keyword + semantic)
2. Document embeddings generated via OpenAI
3. Relevant context retrieved from Elasticsearch
4. AI responses generated using RAG pattern

### Document Management
1. Files uploaded via multer middleware
2. Text extracted and stored in database
3. Embeddings generated for semantic search
4. Documents indexed in Elasticsearch

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database (configured via DATABASE_URL)
- **Elasticsearch**: Search and indexing (ELASTICSEARCH_URL, credentials)
- **OpenAI API**: AI capabilities (OPENAI_API_KEY)

### Key Libraries
- **Database**: Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- **Search**: Elasticsearch client (@elastic/elasticsearch)
- **AI**: OpenAI SDK (openai)
- **UI**: Radix UI components (@radix-ui/*)
- **Forms**: React Hook Form with Zod validation
- **File Upload**: Multer middleware

## Deployment Strategy

### Development Setup
- Uses Vite dev server with HMR for frontend
- Express server with TypeScript compilation via tsx
- Environment variables for service configuration
- Database migrations via Drizzle Kit

### Production Build
- Frontend built to static assets via Vite
- Backend compiled to single bundle via esbuild
- Static file serving integrated into Express server
- Database schema pushed via Drizzle migrations

### Environment Configuration
The system requires several environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `ELASTICSEARCH_URL`: Elasticsearch cluster endpoint
- `ELASTICSEARCH_USERNAME/PASSWORD`: Search service credentials
- `OPENAI_API_KEY`: OpenAI API access token

### Key Features
- **Hybrid Search**: Combines keyword and semantic search capabilities
- **RAG Chatbot**: AI assistant with document context awareness using Elasticsearch ML models
- **Document Processing**: Automatic text extraction and embedding generation via Elasticsearch ML
- **Real-time Analytics**: Dashboard metrics and risk assessment
- **Role-based Access**: Customer, loan officer, and manager roles
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **Pagination**: Applications table limited to top 100 records with 20 items per page
- **Elasticsearch ML Integration**: Uses Elasticsearch machine learning models for embeddings instead of OpenAI

## Recent Changes (July 16, 2025)

### Migration to Standard Replit Environment (July 16, 2025)
- ✓ Successfully migrated from Replit Agent to standard Replit environment
- ✓ Enhanced chatbot with improved Elasticsearch RRF (Reciprocal Rank Fusion) search pattern
- ✓ Added better error handling and fallback mechanisms for AI chatbot
- ✓ Improved chatbot responsiveness with clearer error messages
- ✓ Updated search queries to use Elasticsearch highlighting for better result presentation
- ✓ Enhanced natural language processing with multiple retrieval strategies
- ✓ Added comprehensive fallback responses when external services are unavailable

## Previous Changes (July 15, 2025)

### Migration Updates
- ✓ Successfully migrated from Replit Agent to standard Replit environment
- ✓ Added pagination to applications table (100 record limit, 20 per page)
- ✓ Updated RAG service to use Elasticsearch ML models for embeddings
- ✓ Modified chatbot to rely on Elasticsearch dataset instead of OpenAI embeddings
- ✓ Enhanced error handling for Elasticsearch and OpenAI service failures
- ✓ Improved fallback mechanisms when external services are unavailable

### Natural Language Processing Enhancements (July 15, 2025)
- ✓ Completely removed RAG logic and dependencies from chatbot architecture
- ✓ Implemented direct OpenAI integration with comprehensive natural language processing
- ✓ Added intelligent query parsing for various loan-related questions:
  - Status-based queries: "show me all active/pending/rejected loans"
  - Amount-based queries: "give me loans above $50,000" or "loans between $10,000 and $100,000"
  - Loan type queries: "show me all personal loans" or "find mortgage applications"
  - Customer-specific queries: "loans for John Smith"
  - Risk-based queries: "show me high risk loans"
  - Count queries: "how many active loans are there?"
- ✓ Enhanced chatbot with smart fallback responses that work without OpenAI API
- ✓ Comprehensive pattern matching for loan queries using direct storage access
- ✓ Added robust error handling with graceful degradation to local processing

### Azure OpenAI Integration (July 15, 2025)
- ✓ Implemented Azure OpenAI support with automatic detection and configuration
- ✓ Added environment variable support for AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME
- ✓ Enhanced OpenAI service to automatically use Azure deployment when available
- ✓ Maintained backward compatibility with standard OpenAI API
- ✓ Added initialization logging to show which service (Azure/Standard) is being used
- ✓ Successfully tested complex query processing with Azure OpenAI endpoint

### UI Data Display Fixes (July 15, 2025)
- ✓ Fixed customer name and email display in applications table
- ✓ Applications now show real customer names instead of "Unknown Customer"  
- ✓ Resolved data retrieval logic to use customer info stored directly in applications
- ✓ Eliminated "Invalid user ID" console errors

### Architecture Improvements
- Enhanced applications table with pagination controls and record limits
- Comprehensive natural language processing engine for loan queries
- Smart query parsing with intent recognition and parameter extraction
- Intelligent fallback system that works without external dependencies
- Improved RAG response generation with contextual understanding
- Better error handling throughout the application stack

The architecture emphasizes modularity and scalability, with clear separation of concerns between data access, business logic, and presentation layers. The enhanced natural language processing capabilities allow users to ask complex questions about loans in everyday language, with the system intelligently parsing intent and providing accurate responses. The system now operates efficiently with comprehensive fallback mechanisms when external services are unavailable.