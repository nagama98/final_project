# Elasticsearch Setup Guide

## Overview
This ElastiBank application requires Elasticsearch to provide advanced search capabilities, document indexing, and semantic search features. Currently, the app is running in fallback mode without Elasticsearch.

## Quick Setup Options

### Option 1: Local Elasticsearch (Recommended for Development)

1. **Install Elasticsearch locally:**
   ```bash
   # Download and install Elasticsearch 8.x
   wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.0-linux-x86_64.tar.gz
   tar -xzf elasticsearch-8.11.0-linux-x86_64.tar.gz
   cd elasticsearch-8.11.0/
   
   # Start Elasticsearch
   ./bin/elasticsearch
   ```

2. **Configure environment variables:**
   Add to your Replit Secrets:
   ```
   ELASTICSEARCH_URL=http://localhost:9200
   ELASTICSEARCH_USERNAME=elastic
   ELASTICSEARCH_PASSWORD=your_password_here
   ```

### Option 2: Elasticsearch Cloud (Production Ready)

1. **Create Elastic Cloud account:**
   - Go to [https://cloud.elastic.co/](https://cloud.elastic.co/)
   - Sign up for a free trial or paid plan
   - Create a new deployment

2. **Get connection details:**
   - Copy the Cloud ID and endpoint URL
   - Create API key or use username/password

3. **Configure environment variables:**
   Add to your Replit Secrets:
   ```
   ELASTICSEARCH_URL=https://your-deployment-url.es.region.cloud.es.io:9243
   ELASTICSEARCH_USERNAME=elastic
   ELASTICSEARCH_PASSWORD=your_cloud_password
   ```

### Option 3: Docker (Alternative)

1. **Run Elasticsearch in Docker:**
   ```bash
   docker run -d --name elasticsearch \
     -p 9200:9200 -p 9300:9300 \
     -e "discovery.type=single-node" \
     -e "xpack.security.enabled=false" \
     docker.elastic.co/elasticsearch/elasticsearch:8.11.0
   ```

2. **Configure environment variables:**
   ```
   ELASTICSEARCH_URL=http://localhost:9200
   ```

## Required Environment Variables

The application needs these environment variables to connect to Elasticsearch:

- `ELASTICSEARCH_URL` - The full URL to your Elasticsearch cluster
- `ELASTICSEARCH_USERNAME` - Username for authentication (optional if security disabled)
- `ELASTICSEARCH_PASSWORD` - Password for authentication (optional if security disabled)

## Features Enabled by Elasticsearch

Once connected, you'll have access to:

1. **Hybrid Search**: Combines keyword and semantic search
2. **Document Indexing**: Automatic indexing of loan applications and documents
3. **RAG Chatbot**: AI-powered assistant with document context
4. **Advanced Analytics**: Real-time search and filtering
5. **Semantic Search**: Find documents by meaning, not just keywords

## Verification

After setting up Elasticsearch:

1. Restart the application
2. Check the console - you should see successful index creation messages
3. Test the search functionality in the dashboard
4. Try the RAG chatbot for intelligent responses

## Troubleshooting

### Connection Issues
- Verify Elasticsearch is running on the specified port
- Check firewall settings
- Ensure credentials are correct

### Memory Issues
- Elasticsearch requires at least 2GB RAM
- Increase heap size if needed: `-Xms2g -Xmx2g`

### SSL/TLS Issues
- For local development, disable security: `xpack.security.enabled: false`
- For production, use proper SSL certificates

## Next Steps

1. Set up your preferred Elasticsearch option
2. Add the environment variables to Replit Secrets
3. Restart the application
4. Test the enhanced search and AI features

The application will automatically detect when Elasticsearch is available and enable all advanced features.