# ElastiBank - Technical Documentation

## Overview

ElastiBank is a comprehensive loan management system built with modern web technologies, featuring advanced search capabilities powered by Elasticsearch and AI-driven insights through OpenAI integration.

## Architecture Overview

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Search Engine**: Elasticsearch 8.15.0
- **AI Integration**: OpenAI API
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query

## Elasticsearch Implementation Details

### Indices Structure

#### 1. Loan Applications Index (`loan_applications`)

**Mapping Configuration:**
```json
{
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
```

**Key Features:**
- **Semantic Text Field**: Uses Elasticsearch's `semantic_text` field type for AI-powered search
- **Numeric Fields**: Properly typed for range queries and aggregations
- **Date Fields**: ISO format for temporal queries
- **Dense Vector**: OpenAI embeddings for similarity search

#### 2. Customers Index (`customers`)

**Mapping Configuration:**
```json
{
  "properties": {
    "custId": { "type": "keyword" },
    "firstName": { "type": "text" },
    "lastName": { "type": "text" },
    "email": { "type": "keyword" },
    "phone": { "type": "keyword" },
    "address": { "type": "text" },
    "dateOfBirth": { "type": "date" },
    "ssn": { "type": "keyword" },
    "employmentStatus": { "type": "keyword" },
    "annualIncome": { "type": "double" },
    "creditScore": { "type": "integer" },
    "riskLevel": { "type": "keyword" },
    "totalLoans": { "type": "integer" },
    "totalAmount": { "type": "double" },
    "activeLoans": { "type": "integer" },
    "createdAt": { "type": "date" },
    "updatedAt": { "type": "date" }
  }
}
```

### Search Capabilities

#### 1. Hybrid Search Implementation

**RRF (Reciprocal Rank Fusion) Pattern:**
```typescript
const hybridSearch = {
  query: {
    bool: {
      should: [
        // Keyword matching
        {
          multi_match: {
            query: searchTerm,
            fields: ["customerName^2", "loanType", "purpose", "description"]
          }
        },
        // Semantic search
        {
          semantic: {
            field: "description",
            query: searchTerm
          }
        }
      ]
    }
  }
}
```

#### 2. Advanced Filtering

**Multi-field Filtering:**
```typescript
const filters = {
  bool: {
    filter: [
      { term: { status: "approved" } },
      { range: { amount: { gte: 10000, lte: 50000 } } },
      { term: { loanType: "personal" } },
      { range: { createdAt: { gte: "2023-01-01", lte: "2025-12-31" } } }
    ]
  }
}
```

#### 3. Aggregations for Analytics

**Statistical Aggregations:**
```typescript
const aggregations = {
  loan_types: {
    terms: { field: "loanType" }
  },
  status_breakdown: {
    terms: { field: "status" }
  },
  amount_stats: {
    stats: { field: "amount" }
  },
  risk_ranges: {
    range: {
      field: "riskScore",
      ranges: [
        { to: 30, key: "low" },
        { from: 30, to: 70, key: "medium" },
        { from: 70, key: "high" }
      ]
    }
  }
}
```

### Chatbot Integration

#### Natural Language Processing Flow

1. **Query Analysis**: Parse user intent and extract filters
2. **Elasticsearch Query Construction**: Convert to structured queries
3. **Result Processing**: Format and contextualize results
4. **AI Response Generation**: Use OpenAI for natural language responses

**Query Processing Pipeline:**
```typescript
// 1. Intent Classification
const queryType = classifyQuery(userQuery);

// 2. Filter Extraction
const filters = extractFilters(userQuery);

// 3. Elasticsearch Query
const esQuery = buildElasticsearchQuery(filters);

// 4. Execute Search
const results = await elasticsearch.search('loan_applications', esQuery);

// 5. Generate Context
const context = formatContextForAI(results);

// 6. AI Response
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a banking assistant..." },
    { role: "user", content: context + userQuery }
  ]
});
```

## Data Generation System

### Customer Generation (100 Customers)

**Customer Profile Structure:**
- **Unique Identifiers**: `custId` format: `CUST-{timestamp}-{random}`
- **Demographics**: Name, email, phone, address, date of birth
- **Financial Profile**: Annual income, credit score, employment status
- **Risk Assessment**: Calculated risk level based on credit score

### Loan Application Generation (100 per Customer = 10,000 Total)

**Application Structure:**
- **Application ID**: Format `LA-{year}-{sequence}`
- **Loan Types**: Personal, Mortgage, Auto, Business, Student
- **Amount Ranges**: Type-specific (Personal: $1K-$50K, Mortgage: $50K-$800K)
- **Date Range**: Random dates between 2023-01-01 and 2025-07-30
- **Status Distribution**: Pending, Under Review, Approved, Rejected, Disbursed

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description | Elasticsearch Query |
|----------|---------|-------------|-------------------|
| `/api/applications` | GET | Get all loan applications | `match_all` with pagination |
| `/api/applications/:id` | GET | Get single application | `term` query by document ID |
| `/api/customers` | GET | Get all customers | `match_all` with aggregations |
| `/api/search/applications` | GET | Search applications | Hybrid search with filters |
| `/api/dashboard/metrics` | GET | Dashboard statistics | Multiple aggregations |
| `/api/chat` | POST | AI chatbot queries | Context-aware search + OpenAI |

### Search Features Implementation

#### 1. Full-Text Search
```typescript
// Multi-field search across customer names, loan types, and descriptions
{
  multi_match: {
    query: searchTerm,
    fields: ["customerName^2", "loanType^1.5", "purpose", "description"],
    fuzziness: "AUTO"
  }
}
```

#### 2. Range Queries
```typescript
// Amount-based filtering
{
  range: {
    amount: {
      gte: minAmount,
      lte: maxAmount
    }
  }
}
```

#### 3. Date Filtering
```typescript
// Temporal queries for application dates
{
  range: {
    createdAt: {
      gte: startDate,
      lte: endDate,
      format: "yyyy-MM-dd"
    }
  }
}
```

## Performance Optimizations

### Indexing Strategy
- **Bulk Indexing**: Batch operations for data generation (200 documents per batch)
- **Field Optimization**: Keyword fields for exact matching, text fields for full-text search
- **Mapping Optimization**: Proper field types to prevent fielddata usage

### Query Optimization
- **Result Limiting**: Configurable pagination to prevent large result sets
- **Index Hints**: Use specific indices for targeted queries
- **Caching**: Application-level caching for frequently accessed data

## Elasticsearch Reference Documentation

### Official Elasticsearch Documentation Links

1. **Mapping and Field Types**
   - [Mapping Parameters](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-params.html)
   - [Field Data Types](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html)
   - [Semantic Text Field](https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-text.html)

2. **Query DSL**
   - [Query DSL Overview](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
   - [Bool Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html)
   - [Multi-Match Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-multi-match-query.html)
   - [Range Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-range-query.html)

3. **Aggregations**
   - [Aggregations Overview](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)
   - [Terms Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html)
   - [Range Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-range-aggregation.html)
   - [Stats Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics-stats-aggregation.html)

4. **Search Features**
   - [Highlighting](https://www.elastic.co/guide/en/elasticsearch/reference/current/highlighting.html)
   - [Sorting](https://www.elastic.co/guide/en/elasticsearch/reference/current/sort-search-results.html)
   - [Pagination](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html)

5. **Performance**
   - [Bulk API](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html)
   - [Index Performance Tuning](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html)
   - [Search Performance Tuning](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)

6. **Machine Learning & AI**
   - [Elasticsearch ML](https://www.elastic.co/guide/en/machine-learning/current/index.html)
   - [Vector Search](https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html)
   - [Dense Vector Field](https://www.elastic.co/guide/en/elasticsearch/reference/current/dense-vector.html)

### Elasticsearch Client (Node.js)
- [Elasticsearch JavaScript Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
- [Client API Reference](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html)

## Application Screenshots and Features

### 1. Dashboard Overview
**Elasticsearch Features Used:**
- Aggregation queries for total applications, approved loans, portfolio value
- Terms aggregation for status breakdown
- Stats aggregation for financial metrics

### 2. Applications Management
**Elasticsearch Features Used:**
- Paginated search with `from` and `size` parameters
- Multi-field filtering (status, loan type, amount range, date range)
- Sorting by creation date, amount, risk score
- Full-text search across customer names and application details

### 3. Customer Management
**Elasticsearch Features Used:**
- Customer profile aggregation with loan statistics
- Nested queries to correlate customer and loan data
- Credit score range aggregations
- Employment status filtering

### 4. AI Chatbot
**Elasticsearch Features Used:**
- Semantic text search using ML models
- Hybrid search combining keyword and semantic matching
- Complex query construction from natural language
- Result highlighting and context extraction
- Real-time aggregations for statistical responses

### 5. Advanced Search & Filtering
**Elasticsearch Features Used:**
- Boolean queries with multiple filter conditions
- Range queries for numeric and date fields
- Term queries for exact matching
- Fuzzy matching for typo tolerance
- Aggregation facets for filter options

## Data Compliance & Security

### Data Generation Specifications
- **Date Range**: 2023-01-01 to 2025-07-30 for realistic temporal distribution
- **Volume**: 100 customers × 100 applications = 10,000 total records
- **Uniqueness**: Each customer has unique identifiers and profile data
- **Correlation**: Proper foreign key relationships between customers and applications

### Index Management
- **Existence Checks**: Verify index presence before operations
- **Recreation Logic**: Clean index recreation with proper mapping
- **Backup Strategy**: Data persistence through Elasticsearch cluster

## Troubleshooting Guide

### Common Issues and Solutions

1. **Index Not Found Errors**
   - Check index existence with `checkIndexExists()` method
   - Recreate indices using `/api/recreate-index` endpoint

2. **Fielddata Disabled Errors**
   - Ensure numeric fields use proper mapping types (`double`, `integer`)
   - Avoid text fields in aggregations without fielddata enabled

3. **Query Performance Issues**
   - Implement result limiting and pagination
   - Use appropriate field types for query patterns
   - Monitor query complexity and execution time

4. **Memory Issues**
   - Batch operations for large data sets
   - Implement proper pagination
   - Use scroll API for large result sets

This technical documentation provides comprehensive coverage of the Elasticsearch implementation in ElastiBank, with detailed references to official Elasticsearch documentation for further learning and troubleshooting.