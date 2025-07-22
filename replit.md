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
- **Document Processing**: Automatic text extraction and embedding generation via Elasticsearch ML
- **Real-time Analytics**: Dashboard metrics and risk assessment
- **Role-based Access**: Customer, loan officer, and manager roles
- **Responsive Design**: Mobile-friendly interface with modern UI components
- **Pagination**: Applications table limited to top 100 records with 20 items per page
- **Elasticsearch ML Integration**: Uses Elasticsearch machine learning models for embeddings instead of OpenAI

## Recent Changes (July 22, 2025)

### Migration to Replit Environment (July 22, 2025)
- ✅ Successfully migrated ElastiBank from Replit Agent to standard Replit environment
- ✅ Fixed all Node.js and TypeScript dependency issues for clean deployment
- ✅ Enhanced chatbot logic to comprehensively answer ALL questions about loan applications data
- ✅ Improved chatbot fallback responses to use real-time loan statistics and data context
- ✅ Added intelligent query classification to distinguish data searches from general banking questions
- ✅ Enhanced search capabilities with broad search fallback for better result coverage
- ✅ Fixed TypeScript errors and improved code reliability across chatbot service
- ✅ Maintained all existing functionality while ensuring security and client/server separation
- ✅ Application now runs cleanly on Replit with proper workflow management
- ✅ All 100,000+ loan applications continue to generate and index properly
- ✅ Chatbot can now answer greetings, help requests, banking explanations, and complex data queries
- ✅ Enhanced error handling and graceful degradation when external services are unavailable

### Enhanced Chatbot Query Processing (July 22, 2025)
- ✅ Implemented comprehensive complex query processing for all loan-related questions
- ✅ Added support for natural language queries like "show me all approved loans" and "how many business loans above risk 80?"
- ✅ Enhanced filtering capabilities by loan type, status, amount ranges, risk scores, and credit scores
- ✅ Improved query parsing with regex patterns for amount ranges and risk score thresholds
- ✅ Added intelligent fallback responses using real loan data statistics when AI services unavailable
- ✅ Fixed TypeScript compilation errors and variable scoping issues
- ✅ Implemented broad search capabilities with keyword extraction and wildcard matching
- ✅ Enhanced context generation with detailed loan application information and aggregation data
- ✅ Verified chatbot handles complex questions and provides accurate, data-driven responses
- ✅ System successfully processes queries and returns relevant loan applications with comprehensive details

## Recent Changes (July 17, 2025)

### Code Cleanup and Optimization (July 17, 2025)
- ✅ Removed all unused files and cleaned up codebase for better maintainability
- ✅ Deleted unused server files: fix-customer-data.ts, data-generator.ts, rag.ts, storage.ts, semantic-rag.ts
- ✅ Removed unused client pages: data-management.tsx, new-application.tsx
- ✅ Cleaned up unused UI components (25+ unused shadcn/ui components removed)
- ✅ Fixed all import errors and dependency references after file removal
- ✅ Streamlined routing and removed unused route definitions
- ✅ Consolidated storage logic to use only elasticsearchStorage instead of dual storage
- ✅ Removed unused attached_assets folder and documentation files
- ✅ Eliminated redundant code and simplified architecture
- ✅ Verified application still functions properly with cleaned codebase
- ✅ Completely removed chatbot functionality from codebase as requested
- ✅ Removed RAG chatbot component and all chatbot-related UI elements
- ✅ Deleted all chatbot API endpoints (/api/chat, /api/semantic-search)
- ✅ Removed chatMessage schema and related database operations
- ✅ Cleaned up all chatbot imports and references from frontend and backend
- ✅ Simplified architecture to focus on core loan management features only
- ✅ Updated Elasticsearch mapping to use semantic_text for description field
- ✅ Replaced complex text field with semantic sub-fields with simple semantic_text type
- ✅ Applied mapping changes to both initialization and recreate-index endpoints

### Chatbot Implementation with Azure OpenAI (July 18, 2025)
- ✅ Created comprehensive chatbot service using semantic_text field with Azure OpenAI
- ✅ Implemented RRF (Reciprocal Rank Fusion) search pattern with semantic queries
- ✅ Added semantic search on description, customerName, loanType, and purpose fields
- ✅ Created responsive chatbot UI component with message history and source citations
- ✅ Added chatbot API endpoint with proper error handling and validation
- ✅ Integrated chatbot into sidebar navigation as "AI Assistant"
- ✅ Added fallback to regular multi-match search when semantic search fails
- ✅ Implemented highlighted text extraction for semantic_text matches
- ✅ Added source citation system showing application ID, customer name, and loan type
- ✅ Created floating chatbot UI with message icon that expands/collapses
- ✅ Added minimize/maximize and close functionality to chatbot window
- ✅ Fixed semantic_text field compatibility issues with fallback queries
- ✅ Integrated floating chatbot across all pages of the application
- ✅ Enhanced chatbot to work with limited fields when semantic_text causes issues
- ✅ Fixed Azure OpenAI client integration by exposing public methods for chatbot access
- ✅ Enhanced chatbot to answer ALL types of natural language questions (not just data searches)
- ✅ Improved response quality with comprehensive banking and loan knowledge
- ✅ Added intelligent fallback responses for different question categories
- ✅ Increased response length and creativity (temperature 0.7, max_tokens 800)
- ✅ Enhanced context formatting with detailed loan application information
- ✅ Verified chatbot responds to greetings, help requests, banking explanations, and data queries
- ✅ Enhanced Elasticsearch search logic with multiple fallback strategies
- ✅ Added comprehensive search logging and performance monitoring
- ✅ Implemented intelligent query analysis with amount range extraction
- ✅ Added search result analysis with loan type and status statistics
- ✅ Enhanced context prompts with real-time search summaries and metadata
- ✅ Improved error handling with contextual error responses
- ✅ Added processing time tracking for search and response generation
- ✅ Upgraded search to support wildcard, phrase, and range queries
- ✅ Fixed chatbot UI blank response issue by correcting JSON response parsing
- ✅ Enhanced chatbot response formatting with improved word wrapping and readability
- ✅ Increased chatbot window size to 420px width and 550px height for better visibility
- ✅ Improved source citation display with enhanced formatting and visual design
- ✅ Created reusable ChatbotService for consistent behavior across all chatbot components
- ✅ Updated both floating chatbot and main chatbot component with unified logic
- ✅ Enhanced message display with better text wrapping and overflow handling
- ✅ Improved chatbot window size (450px width, 600px height) for better content visibility
- ✅ Enhanced text formatting with CSS class for consistent word wrapping and line height
- ✅ Optimized AI response settings (temperature 0.3, max_tokens 500) for concise responses
- ✅ Added markdown formatting cleanup for cleaner chat display
- ✅ Improved scrollable area height (420px) for better message viewing
- ✅ Enhanced natural language output formatting for English responses
- ✅ Fixed floating chatbot text overflow and wrapping issues for proper display within response panel
- ✅ Reduced floating chatbot window size (400px width, 550px height) for better mobile compatibility
- ✅ Added specific CSS class for floating chatbot text with smaller font size (12px) and improved line height
- ✅ Enhanced source citation display with truncated text and compact formatting
- ✅ Improved scrollable area with explicit overflow-y-auto for better message viewing
- ✅ Optimized message padding and spacing for floating chatbot interface

### Comprehensive Elasticsearch Query Implementation (July 21, 2025)
- ✅ Enhanced chatbot to query entire Elasticsearch index for comprehensive statistics
- ✅ Added comprehensive stats method to Elasticsearch service with aggregations
- ✅ Implemented query condition parsing for loan type, status, amount, and risk score filters
- ✅ Created full index statistics gathering with total matching records vs total records
- ✅ Enhanced context generation with statistical breakdowns and aggregations
- ✅ Added comprehensive response generation with total counts and specific examples
- ✅ Implemented loan type and status breakdown aggregations
- ✅ Added total loan amount calculations and risk score range filtering
- ✅ Enhanced AI response prompts to include "I found X applications out of Y total" format
- ✅ Created detailed example listings with customer names, amounts, and application details
- ✅ Optimized response format for statistical summaries with specific examples
- ✅ Added comprehensive error handling for full index analysis
- ✅ Fixed Elasticsearch aggregation issues and OpenAI integration for reliable responses
- ✅ Enhanced floating chatbot text wrapping and overflow handling for proper display
- ✅ Optimized chatbot response settings (max_tokens: 200) for concise, readable output
- ✅ Fixed CSS styling for floating chatbot with break-words and whitespace-pre-wrap
- ✅ Improved chatbot error handling with simplified fallback responses
- ✅ Successfully tested comprehensive search functionality with business loan queries
- ✅ Verified chatbot processes natural language queries and provides structured responses
- ✅ Fixed Elasticsearch field mapping for amount, interestRate, and income to use numeric types (double/float)
- ✅ Resolved "Fielddata is disabled" error by changing amount field from text to double type
- ✅ Enhanced amount-based query parsing with comprehensive regex patterns for "below/above/under/over"
- ✅ Implemented direct Elasticsearch range queries for amount filtering on entire index
- ✅ Successfully tested "show me all loan below 15000" query returning 39 real loan applications
- ✅ Verified comprehensive amount-based search with proper numeric filtering and sorting
- ✅ Added detailed logging for amount query detection and filter extraction debugging
- ✅ Confirmed chatbot now queries entire loan_applications index for accurate statistical responses
- ✅ Enhanced chatbot response format to prominently display count AND matching documents
- ✅ Implemented "Found X matching applications out of Y total" format at start of responses
- ✅ Added comprehensive document details with loan IDs, customer names, amounts, and statuses
- ✅ Created statistical breakdowns by loan type and status for better data insights
- ✅ Verified both count display and detailed document listing work for all amount-based queries
- ✅ Successfully tested "loans above 50000" returning 50 real applications with full details
- ✅ Implemented comprehensive count-based query detection and handling
- ✅ Added support for count queries: total, count, how many, number of, statistics, summary, overview, breakdown
- ✅ Enhanced count query responses with "Total: X loan applications in the database" format
- ✅ Created comprehensive statistics breakdown showing loan types, statuses, amounts, and risk analysis
- ✅ Successfully tested multiple count query variations with detailed statistical responses
- ✅ Verified count queries return real database totals with comprehensive aggregation data
- ✅ Added query pattern detection for "all applications", "show me all", and "list all" variations

### Unique Customer Names for Loan Applications (July 17, 2025)
- ✅ Updated loan application generation to create unique customer names for each application
- ✅ Each of the 100,000 loan applications now has a different customer name combination
- ✅ Implemented random name generation using diverse first names (Alexander, Sophia, Benjamin, etc.)
- ✅ Enhanced name diversity with varied last names (Anderson, Bennett, Kumar, O'Connor, etc.)
- ✅ Generated unique email addresses for each loan application based on customer names
- ✅ Randomized credit scores and income levels for each individual application
- ✅ Maintained semantic text field structure for enhanced search capabilities
- ✅ Successfully indexed 100,000 loan applications with unique customer identities
- ✅ Verified system displays different customer names across all applications
- ✅ Enhanced data realism with individual customer profiles for each loan application

### Elasticsearch Query Functionality Fix (July 17, 2025)
- ✅ Fixed Elasticsearch query execution to properly access Elastic Cloud instance with 100,000 loan applications
- ✅ Corrected RAG service to use direct Elasticsearch storage instead of fallback-only approach
- ✅ Enhanced natural language processing to handle multiple filter conditions (status + loan type)
- ✅ Implemented proper filtering logic for combined queries like "approved business loans"
- ✅ Added comprehensive debug logging to track query parsing and filtering process
- ✅ Verified chatbot correctly filters results: 390 approved business loans from 10,000 total applications
- ✅ Fixed risk level display calculation based on risk score (High >70, Medium 30-70, Low <30)
- ✅ Enhanced response formatting to show proper loan details with risk levels and scores
- ✅ Confirmed all 50 returned results are correctly filtered business loans with approved status

### Data Generation Updates (July 17, 2025)
- ✓ Updated data generation logic to create exactly 100 customers with 1000 loan applications each
- ✓ Enhanced customer generator to create proper customer-loan correlation using custId field
- ✓ Implemented comprehensive loan application generation with realistic data distribution
- ✓ Added loan type-specific amount ranges (personal: $1k-$50k, mortgage: $50k-$800k, etc.)
- ✓ Created loan type-specific term ranges (personal: 1-5 years, mortgage: 5-30 years, etc.)
- ✓ Added realistic loan purposes based on loan type (debt consolidation, home purchase, etc.)
- ✓ Implemented credit score-based interest rate calculation
- ✓ Added batch processing for efficient Elasticsearch indexing
- ✓ Created customer statistics calculation with loan portfolio metrics
- ✓ Added data clearing functionality to reset existing data
- ✓ Implemented progress tracking for data generation process
- ✓ Added /api/generate-data endpoint for manual data regeneration
- ✓ Fixed schema validation to handle both string and number customerId formats
- ✓ Enhanced New Application form functionality with proper validation
- ✓ Total data structure: 100 customers × 1000 loans = 100,000 loan applications
- ✓ Removed New Application button from applications page view as requested
- ✓ Updated Recent Applications layout to remove New Application button from UI
- ✓ Updated layout to fit full screen width across all pages and components
- ✓ Added advanced search capabilities to customer page similar to applications page
- ✓ Enhanced customer search with multiple filter options (credit score, employment, loan activity)
- ✓ Implemented comprehensive customer filtering system for improved performance
- ✓ Added search by customer ID, phone number, and expanded search capabilities
- ✓ Enhanced user experience with reset functionality and result counters
- ✓ Updated chatbot logic to implement natural language to Elasticsearch query conversion
- ✓ Enhanced chatbot with comprehensive field search capabilities (customer name, custId, loan ID, status, amount, risk level)
- ✓ Implemented complete chatbot flow: natural language → Elasticsearch query → execute query → AI response → final response
- ✓ Added intelligent query parsing for complex natural language questions
- ✓ Enhanced context generation for AI model with detailed loan application summaries
- ✓ Improved chatbot responsiveness with structured data analysis and intelligent fallbacks

### UI Improvements (July 17, 2025)
- ✓ Successfully completed migration from Replit Agent to Replit environment
- ✓ Removed Tools tab from sidebar navigation as requested
- ✓ Removed Settings tab from sidebar navigation as requested
- ✓ Removed New Application tab from sidebar navigation as requested
- ✓ Removed New Application button from applications page as requested
- ✓ Restored New Application button with enhanced Elasticsearch integration
- ✓ Enhanced loan application form to generate unique customer IDs (custId format: CUST-XXXXX-XXXXX)
- ✓ Updated customer page to display loan IDs in a dedicated column
- ✓ Added recentLoans interface to Customer type with loan details
- ✓ Enhanced customer API to include loan correlation data with applicationId, status, and amount
- ✓ Implemented loan ID display showing up to 3 recent loans per customer with status indicators
- ✓ Added proper error handling for customer loan data retrieval
- ✓ Cleaned up unused imports in sidebar component (Calculator, TrendingUp, Bot, Database, Settings, Shield, Plus)
- ✓ Simplified sidebar to show only: Dashboard, Applications, Customers, Documents
- ✓ Updated new application form logic to use modal dialog instead of separate page
- ✓ Integrated new application form directly into applications page
- ✓ Removed separate /new-application route and page component
- ✓ Enhanced user experience with modal-based form submission
- ✓ Removed metrics cards from applications page as requested
- ✓ Kept only Advanced Search & Filters and recent applications table
- ✓ Cleaned up unused imports (FileText, Clock, Check, DollarSign)
- ✓ Enhanced Advanced Search with calendar-based date filtering, replacing dropdown with date range picker functionality
- ✓ Added start date and end date calendar selectors for precise date filtering
- ✓ Updated SearchFilters interface to include startDate and endDate fields
- ✓ Implemented custom date range filtering logic in applications table
- ✓ Added customer data to Elasticsearch with correlation to loan applications
- ✓ Created CustomerESDocument schema with loan statistics (totalLoans, totalAmount, activeLoans)
- ✓ Implemented customer API endpoints (/api/customers, /api/customers/:id)
- ✓ Enhanced customer page with comprehensive table showing loan correlations
- ✓ Added customer summary cards with portfolio metrics and credit score analytics
- ✓ Integrated customer search and risk level filtering capabilities
- ✓ Established customer-loan relationship using common customerId field
- ✓ Verified application functionality with all features working correctly

## Previous Changes (July 16, 2025)

### Applications Page Enhancement (July 16, 2025)
- ✓ Removed tabs from applications component while keeping dashboard unchanged
- ✓ Enhanced +New Application button functionality with proper routing to /new-application
- ✓ Added automatic redirect to applications page after successful form submission
- ✓ Verified new applications save directly to Elasticsearch index (loan_applications)
- ✓ Enhanced error handling and debugging for Azure OpenAI connections
- ✓ Added detailed logging for Azure OpenAI requests and responses
- ✓ Improved temperature setting (0.3) for more consistent AI responses
- ✓ Confirmed Azure OpenAI integration working correctly with 2-4 second response times

### Azure OpenAI Reliability Improvements (July 16, 2025)
- ✓ Implemented retry mechanism with exponential backoff (up to 3 attempts)
- ✓ Added timeout protection (15 seconds for initial request, 10 seconds for follow-up)
- ✓ Enhanced error handling with specific messages for different failure types
- ✓ Added graceful fallback to local processing when Azure OpenAI is unavailable
- ✓ Improved user error messages for authentication and network issues
- ✓ Comprehensive logging for troubleshooting connection problems
- ✓ Verified system handles complex queries like "Show me all pending mortgage loans"
- ✓ Confirmed Azure OpenAI processes 50+ loan results with professional responses
- ✓ Enhanced chatbot to handle all natural language questions (general, explanations, greetings, help)
- ✓ Added comprehensive intent classification system for different query types
- ✓ Improved chatbot with detailed responses for banking and loan management topics
- ✓ Updated chatbot interface to reflect expanded capabilities beyond loan searches

### Migration to Standard Replit Environment (July 16, 2025)
- ✓ Successfully migrated from Replit Agent to standard Replit environment
- ✓ Configured Azure OpenAI integration with gpt-4o deployment
- ✓ Enhanced chatbot with improved Elasticsearch RRF (Reciprocal Rank Fusion) search pattern
- ✓ Added better error handling and fallback mechanisms for AI chatbot
- ✓ Improved chatbot responsiveness with clearer error messages
- ✓ Updated search queries to use Elasticsearch highlighting for better result presentation
- ✓ Enhanced natural language processing with multiple retrieval strategies
- ✓ Added comprehensive fallback responses when external services are unavailable
- ✓ Verified Azure OpenAI connectivity and performance (3-5 second response times)
- ✓ Updated chatbot interface to indicate Azure OpenAI integration

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