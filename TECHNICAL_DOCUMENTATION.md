# ElastiBank Technical Documentation

## Overview
ElastiBank is a comprehensive loan management system that leverages Elasticsearch for advanced search capabilities, data indexing, and real-time analytics. This document provides detailed technical insights into the Elasticsearch integration and implementation.

## System Architecture

### Technology Stack
- **Backend**: Node.js with Express.js and TypeScript
- **Frontend**: React 18 with TypeScript and Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Search Engine**: Elasticsearch 8.15+ with hybrid search capabilities
- **AI Integration**: OpenAI API for embeddings and chat completions

### Data Structure
The system manages three primary Elasticsearch indices:
1. **customers** - Customer profiles and statistics
2. **loan_applications** - Loan application data with semantic search
3. **users** - System users and authentication data

## Elasticsearch Implementation Details

### 1. Index Mapping and Configuration

#### Loan Applications Index Mapping
```json
{
  "mappings": {
    "properties": {
      "applicationId": { "type": "keyword" },
      "customerId": { "type": "keyword" },
      "custId": { "type": "keyword" },
      "customerName": { "type": "text" },
      "customerEmail": { "type": "keyword" },
      "loanType": { "type": "keyword" },
      "amount": { "type": "double" },
      "term": { "type": "integer" },
      "status": { "type": "keyword" },
      "interestRate": { "type": "text" },
      "riskScore": { "type": "integer" },
      "purpose": { "type": "text" },
      "income": { "type": "text" },
      "creditScore": { "type": "integer" },
      "collateral": { "type": "keyword" },
      "description": { "type": "semantic_text" },
      "documents": { "type": "text" },
      "notes": { "type": "text" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536
      }
    }
  }
}
```

**Key Elasticsearch Features Used:**
- **semantic_text**: Advanced semantic search capabilities for natural language queries
- **dense_vector**: OpenAI embeddings storage for similarity search
- **keyword**: Exact match filtering for status, loan types, and IDs
- **double**: Numeric range queries for loan amounts and financial data
- **date**: Time-based filtering and sorting

### 2. Core Elasticsearch Services

#### ElasticsearchService Class
Located: `server/services/elasticsearch.ts`

**Key Methods:**
- `initializeIndices()`: Creates indices with proper mappings
- `bulkIndex()`: Batch document insertion for performance
- `search()`: Advanced search with filters and aggregations
- `getAllDocuments()`: Retrieval with pagination support
- `deleteIndex()`: Index management and cleanup

#### Search Implementation
```typescript
async search(index: string, query: any): Promise<any> {
  const response = await this.client.search({
    index,
    body: query
  });
  return response.body;
}
```

### 3. Advanced Search Features

#### Hybrid Search Implementation
Combines keyword and semantic search for optimal results:

```typescript
const searchQuery = {
  query: {
    bool: {
      should: [
        {
          multi_match: {
            query: searchTerm,
            fields: ["customerName", "loanType", "purpose", "description"],
            type: "best_fields"
          }
        },
        {
          semantic: {
            field: "description",
            query: searchTerm
          }
        }
      ]
    }
  }
};
```

#### Range Queries for Financial Data
```typescript
const amountFilter = {
  range: {
    amount: {
      gte: minAmount,
      lte: maxAmount
    }
  }
};
```

### 4. Data Generation and Indexing

#### Bulk Indexing Performance
- **Batch Size**: 200 documents per bulk operation
- **Date Range**: 2024-01-01 to 2025-07-30 for realistic data
- **Index Checks**: Validates existence before operations

#### Sample Data Structure
```json
{
  "applicationId": "LA-2025-000001",
  "customerId": "CUST-ABC123-XYZ789",
  "customerName": "John Smith",
  "loanType": "personal",
  "amount": 25000.00,
  "status": "approved",
  "riskScore": 65,
  "createdAt": "2024-03-15T10:30:00Z"
}
```

### 5. Real-time Analytics

#### Dashboard Metrics Aggregation
```typescript
const metricsQuery = {
  aggs: {
    status_breakdown: {
      terms: { field: "status" }
    },
    loan_type_breakdown: {
      terms: { field: "loanType" }
    },
    total_portfolio: {
      sum: { field: "amount" }
    }
  }
};
```

#### Risk Score Analysis
```typescript
const riskQuery = {
  aggs: {
    risk_distribution: {
      histogram: {
        field: "riskScore",
        interval: 10
      }
    }
  }
};
```

## Application Features and Elasticsearch Logic

### 1. Dashboard Analytics
**File**: `client/src/pages/dashboard.tsx`
**Elasticsearch Logic**: 
- Aggregation queries for loan status distribution
- Sum aggregations for portfolio totals
- Term aggregations for loan type breakdown

**Reference**: [Elasticsearch Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)

### 2. Applications Management
**File**: `client/src/pages/applications.tsx`
**Elasticsearch Logic**:
- Multi-match queries across multiple fields
- Range queries for amount filtering
- Date range filtering for application periods
- Pagination with `from` and `size` parameters

**Reference**: [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)

### 3. Customer Management
**File**: `client/src/pages/customers.tsx`
**Elasticsearch Logic**:
- Customer profile storage and retrieval
- Loan correlation through `custId` field
- Statistical aggregations for customer portfolios

**Reference**: [Elasticsearch Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)

### 4. AI-Powered Chatbot
**File**: `client/src/components/chatbot.tsx`
**Elasticsearch Logic**:
- Semantic search using `semantic_text` field
- RRF (Reciprocal Rank Fusion) for result ranking
- Complex query parsing and execution
- Natural language to Elasticsearch query conversion

**Reference**: [Elasticsearch Semantic Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-search.html)

### 5. Document Management
**File**: `client/src/pages/documents.tsx`
**Elasticsearch Logic**:
- Document indexing with extracted text
- Embedding generation for similarity search
- Full-text search across document content

**Reference**: [Elasticsearch Dense Vector](https://www.elastic.co/guide/en/elasticsearch/reference/current/dense-vector.html)

## Performance Optimizations

### 1. Bulk Operations
- Uses bulk API for efficient data insertion
- Batch size optimized for memory and performance (200 docs)
- Progress tracking for large data operations

### 2. Index Management
- Proper field mapping for query optimization
- Index existence checks to prevent errors
- Strategic use of `keyword` vs `text` fields

### 3. Query Optimization
- Efficient filter combinations using `bool` queries
- Pagination to handle large result sets
- Selective field retrieval to reduce bandwidth

## Security and Best Practices

### 1. Data Validation
- Zod schemas for request validation
- Type-safe Elasticsearch operations
- Error handling and graceful degradation

### 2. Index Security
- Environment-based configuration
- Secure credential management
- Connection validation and health checks

### 3. Performance Monitoring
- Query performance logging
- Index size monitoring
- Search result analysis

## Elasticsearch Reference Documentation

### Core References
- [Elasticsearch Official Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Elasticsearch Node.js Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Elasticsearch Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)

### Advanced Features
- [Semantic Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-search.html)
- [Dense Vector Fields](https://www.elastic.co/guide/en/elasticsearch/reference/current/dense-vector.html)
- [Aggregations Framework](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)

### Performance and Optimization
- [Bulk API](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html)
- [Index Templates](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html)
- [Search Performance](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)

## Recent Updates (July 30, 2025)

### Migration Improvements
- ✅ Updated data generation to use 2024-2025 date range
- ✅ Removed 100 record limit from applications API
- ✅ Configured 100 customers with 1 loan application each
- ✅ Added comprehensive index existence checks
- ✅ Enhanced error handling and validation

### Performance Enhancements
- ✅ Optimized bulk indexing operations
- ✅ Improved query performance with proper field mapping
- ✅ Added real-time progress tracking
- ✅ Enhanced data validation and type safety

## Architecture Diagrams

### Data Flow Architecture
```
Frontend (React) 
    ↓ API Requests
Express.js Server
    ↓ Elasticsearch Queries
Elasticsearch Cluster
    ↓ Document Storage/Retrieval
Application Data
```

### Search Architecture
```
User Query → Natural Language Processing → Elasticsearch Query DSL → Index Search → Results Ranking → Response
```

This documentation provides comprehensive coverage of the Elasticsearch implementation in ElastiBank, with detailed technical insights and reference links for further exploration.