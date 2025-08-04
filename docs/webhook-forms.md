# n8n Webhook Forms Documentation

This document describes the HTML forms created for interacting with n8n webhooks in the E2E Testing Platform.

## Overview

The platform now includes user-friendly HTML forms that integrate with n8n webhooks for:
- Creating users
- Creating projects
- Creating test cases
- Running tests

## Available Forms

### 1. Dashboard (`/dashboard`)
- Main navigation page with links to all forms
- Workflow guidance
- API endpoint information

### 2. Create User (`/create-user`)
**Webhook:** `https://dipv-digiflux-4.app.n8n.cloud/webhook-test/create-user`

**Fields:**
- Name (required)
- Email (required) 
- Role (required): manager, tester, lead_tester, admin

**Response:**
```json
{
  "success": true,
  "user_id": "5198770f-b380-4c38-bbff-c8072581ee4b",
  "message": "User created successfully"
}
```

### 3. Create Project (`/create-project`)
**Webhook:** `https://dipv-digiflux-4.app.n8n.cloud/webhook-test/create-project`

**Fields:**
- Project Name (required)
- Environment (required): dev, staging, prod
- Base URL (required)
- Description (optional)
- Project Manager ID (required)
- Team Members: Array of tester objects with tester_id and role

**Response:**
```json
{
  "success": true,
  "project": "TodoList Testing",
  "message": "Project created successfully"
}
```

### 4. Create Test Case (`/create-test-case`)
**Webhook:** `https://dipv-digiflux-4.app.n8n.cloud/webhook-test/create-test-case`

**Fields:**
- Project ID (required)
- Test Name (required)
- Test Type (required): ui, api, integration, e2e
- Priority (required): low, medium, high, critical
- Script JSON: Playwright test script (optional)
- Tags: Array of strings for categorization
- Created By (required): User ID

**Response:**
```json
{
  "success": true,
  "test_case_id": "79217634-0136-4b98-afa9-44bd5698193d",
  "message": "Test case created successfully"
}
```

### 5. Run Tests (`/run-tests`)
**Webhook:** `https://dipv-digiflux-4.app.n8n.cloud/webhook-test/run-tests`

**Fields:**
- Project ID (required)
- Test Case IDs (required): Array of test case IDs to execute
- Run By User ID (required): User ID initiating the test run
- Base URL (required): URL where tests will be executed

**Response:**
```json
{
  "success": true,
  "run_id": "test-run-id",
  "status": "started",
  "message": "Test execution started successfully",
  "test_count": 1,
  "estimated_completion": "2-5 minutes",
  "results_url": "https://example.com/results/run-id"
}
```

## Features

### UI/UX Features
- Responsive design that works on desktop and mobile
- Consistent styling across all forms
- Form validation with error messages
- Loading states during API calls
- Success/error result display
- Pre-filled example data for testing
- Navigation between forms

### Error Handling
- Client-side validation for required fields
- Network error handling
- API error response display
- User-friendly error messages

### Form Enhancements
- Dynamic form elements (add/remove team members, tags)
- Radio button options for script types
- Dropdown selections for predefined values
- Textarea with monospace font for code
- Help text for each field

## Workflow

Recommended workflow for using the forms:

1. **Create Users** - Set up team members with appropriate roles
2. **Create Project** - Define project scope and assign team
3. **Create Test Cases** - Add test scripts and organize with tags
4. **Run Tests** - Execute test cases in batches with real-time monitoring

## Integration

The forms integrate seamlessly with the existing E2E Testing Platform:
- Same styling and design patterns as existing forms
- Navigation links between all forms
- Integration with existing test conversion functionality
- Consistent error handling patterns

## Example Usage

### Creating a Complete Test Setup

1. **Create Manager User:**
   ```
   Name: Test Manager
   Email: manager@company.com
   Role: manager
   ```

2. **Create Tester User:**
   ```
   Name: Lead Tester
   Email: tester@company.com
   Role: lead_tester
   ```

3. **Create Project:**
   ```
   Name: TodoList Testing
   Environment: prod
   Base URL: https://todolistme.net
   Manager ID: [from step 1]
   Team: [tester from step 2]
   ```

4. **Create Test Case:**
   ```
   Project ID: [from step 3]
   Test Name: TodoList - Add and Complete Task
   Type: ui
   Priority: high
   Script: [Playwright test code]
   Tags: smoke, core-functionality
   ```

## Technical Details

- All forms use vanilla JavaScript (no external dependencies)
- Forms submit directly to n8n webhook endpoints
- CORS is handled by the n8n webhooks
- Forms include comprehensive client-side validation
- Responsive CSS Grid layout for optimal display
- Semantic HTML for accessibility

## Testing

To test the forms:
1. Start the server: `npm start`
2. Navigate to `http://localhost:3000/dashboard`
3. Use the forms with the provided example data
4. Verify webhook responses in the result sections
