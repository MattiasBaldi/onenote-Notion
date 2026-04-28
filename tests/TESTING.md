# Testing Guide - OneNote to Notion Sync

## Test Files

### 1. `onenote.test.js` - OneNote Service Tests
**What it tests**: Microsoft Graph API integration, authentication, and OneNote operations

**Tests**:
- ONENOTE_CLIENT_ID configuration
- Module exports (listNotebooks, listSectionPages, getPageContent, etc.)
- Auth functions (getAccessToken, loadEnvFile)
- **Integration test**: Real API call to list notebooks (requires cached session)

**Run**:
```bash
node tests/onenote.test.js
```

**Status**: 10/11 tests pass
- ℹ️ Integration test requires: `o2n auth login` (to cache access token)

**Skip integration test** (for CI/CD):
```bash
export SKIP_INTEGRATION=1
node tests/onenote.test.js
```

---

### 2. `notion.test.js` - Notion Service Tests
**What it tests**: Notion SDK integration and page/block operations

**Tests**:
- NOTION_TOKEN validation
- Client initialization
- Page operations (create, update, get, search, trash, restore)
- Block operations (list, append)
- **Integration test**: Real API call (search for pages)

**Run**:
```bash
node tests/notion.test.js
```

**Status**: 17/17 tests pass ✓
- No additional setup needed
- Integration test is fully functional

---

### 3. `agent.test.js` - Agent Service Tests (Gemini)
**What it tests**: LangChain + Gemini LLM integration and Context7 docs

**Tests**:
- LLM provider configuration (gemini, openai, claude, local)
- AGENT_API_KEY and AGENT_MODEL setup
- CONTEXT7_API_KEY validation
- LangChain tool definitions
- Schema validation
- **Integration test**: Real LLM client creation (Gemini)

**Run**:
```bash
node tests/agent.test.js
```

**Status**: 11/16 tests pass
- ⚠️ Missing: CONTEXT7_API_KEY (get from https://context7.com)
- ✓ Gemini client creation works with your API key

---

### 4. `api-integration.test.js` - Full Integration Tests
**What it tests**: All services working together

**Tests**:
- Notion client initialization
- OneNote Graph API exports
- Agent tools and schemas
- Core sync engine functions
- CLI configuration

**Run**:
```bash
node tests/api-integration.test.js
```

**Status**: 9/12 tests pass
- ⚠️ Missing: CONTEXT7_API_KEY
- ✓ All other layers functional

---

## Run All Tests

```bash
bash tests/run-all.sh
```

This runs all test files sequentially and reports total results.

---

## Required Environment Variables

**For full test coverage**, set these in `.env`:

```bash
# OneNote (required)
ONENOTE_CLIENT_ID=your-azure-app-id

# Notion (required)
NOTION_TOKEN=your-notion-token

# Gemini LLM (required)
LLM_PROVIDER=gemini
AGENT_API_KEY=your-gemini-api-key
AGENT_MODEL=gemini-2.5-flash-lite

# Live API Docs (required for full sync)
CONTEXT7_API_KEY=your-context7-key
```

---

## Expected Results

### Minimal Setup (OneNote + Notion only)
- OneNote: 10/11 tests pass (skip integration test)
- Notion: 17/17 tests pass ✓
- Agent: 11/16 tests pass (missing Context7)
- **Result**: Can list data, but sync planning requires Context7

### Full Setup (All services)
- OneNote: 11/11 tests pass ✓
- Notion: 17/17 tests pass ✓
- Agent: 16/16 tests pass ✓
- **Result**: Ready for full sync workflow

---

## Troubleshooting

### OneNote Integration Test Fails
```
Error: Session required - run 'o2n auth login' first
```
**Fix**: Run authentication first
```bash
o2n auth login
```

### Notion API Call Fails
```
Error: Invalid NOTION_TOKEN
```
**Fix**: Check your Notion token
- Create new integration at https://www.notion.so/my-integrations
- Copy token and add to `.env`
- Verify token format: `ntn_...`

### Agent/Context7 Tests Fail
```
Error: CONTEXT7_API_KEY not set
```
**Fix**: Get free Context7 key
- Visit https://context7.com
- Create account and get API key
- Add `CONTEXT7_API_KEY=...` to `.env`

### LangChain Package Error
```
Error: No "exports" main defined
```
**Fix**: Reinstall dependencies with compatible versions
```bash
npm install --legacy-peer-deps
```

---

## What Each Service Does

### OneNote Service
- Authenticates with Microsoft Graph API (OAuth device flow)
- Lists notebooks, sections, pages
- Fetches page content as XHTML/Markdown
- Writes new pages to OneNote

### Notion Service  
- Authenticates with Notion API token
- Creates, updates, reads pages
- Manages blocks and rich text
- Searches workspace

### Agent Service
- Creates LangChain agent with Gemini
- Fetches live API docs from Context7
- Generates Notion schemas from OneNote content
- Orchestrates sync workflow (preview → plan → apply)

---

## Integration Test Flow

```
User runs: o2n sync apply
    ↓
OneNote Service: Fetch notebooks → Get pages as Markdown
    ↓
Agent Service: Create Gemini agent → Query Context7 for schemas
    ↓
Agent: Generate Notion-compatible transformation for each page
    ↓
Notion Service: Create pages with transformed content
    ↓
Done!
```

Each service is tested independently, then as a complete system.
