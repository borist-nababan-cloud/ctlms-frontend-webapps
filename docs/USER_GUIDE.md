# CoalLogix System - User Guide

## Introduction
Welcome to the CoalLogix System (NSM). This application allows you to manage the end-to-end coal trading process, from procurement and logistics to inventory and finance.

## Getting Started

### 1. Login
-   **URL**: Access the application via your browser.
-   **Credentials**: Enter your email and password.
-   **Roles**: Your access to features depends on your assigned role (e.g., Admin, Logistics, Finance).
-   **First Time**: If you are a new user, you may have "Role 7" (Unassigned). Contact your administrator to grant you the correct access.

### 2. Dashboard
Upon logging in, you will see the main Dashboard. providing a high-level overview of operations.

---

## Modules

### 1. Master Data
Manage the core data used across the system.
*   **Partners**: Manage Suppliers, Customers, and Transporters.
    *   *Action*: View details, Add new partners, Edit contact info.
*   **Products**: Define coal products and specifications.
    *   *Action*: Set SKU codes, descriptions, and units (MT/Kg).

### 2. Procurement (Shipments)
Track inbound coal shipments from suppliers.
*   **Shipment List**: View all planned, active, and completed shipments.
    *   *Columns*: Reference No, Supplier, Vessel, ETA, Status.
*   **Create Shipment**:
    1.  Click "Add New Shipment".
    2.  Select Supplier and Vessel (or enter text for Barge).
    3.  Set Origin Jetty and ETA.
    4.  Select Product and enter Planned Qty (MT).
    5.  Save.
*   **Status Workflow**: Planned -> Loading -> Sailing -> Discharging -> Completed.

### 3. Logistics
Manage the movement of coal from Jetty/Port to Stockpile.

#### Tally Input (Mobile Optimized)
Designed for field staff to input truck weights.
*   **Access**: Navigate to `Logistics > Tally Input`.
*   **Form**:
    *   **Shipment**: Select the active shipment (Barge).
    *   **Truck ID**: Enter the truck license plate.
    *   **Weights**: Enter Gross Weight and Tare Weight (Kg). Net Weight is calculated automatically.
    *   **Photo**: (Optional) Take a photo of the delivery ticket.
*   **Submit**: Saves the record to the database instantly.

#### Monitoring (Desktop)
View real-time trucking logs.
*   **Access**: Navigate to `Logistics > Monitoring`.
*   **Features**:
    *   **Table**: View all trucking logs with timestamps and weights.
    *   **Search**: Filter by Truck ID or Shipment.
    *   **Sort**: Click headers to sort by Date or Weight.

### 4. Inventory
Monitor stock levels at the stockpile.
*   **Current Stock**:
    *   View total quantity on hand for each product (in Kg and Metric Tonnes).
*   **Stock History**:
    *   Audit trail of all movements (Inbound Tally, Outbound Sales, Adjustments).
    *   Verify when and why stock changed.

### 5. Settings
*   **Theme**: Toggle between Light Mode and Dark Mode using the sun/moon icon in the header.
*   **Language**: Switch between English and Indonesian (Header dropdown).

---

## Troubleshooting

### "Access Denied / Unassigned Role"
If you see a red alert stating you are "Unassigned", it means your account has been created but not authorized. Please contact the System Administrator.

### "Loading Stuck"
If the screen is blank with a spinner for more than 10 seconds, the system will timeout and attempt to load anyway. Check your internet connection.

### "Submission Error"
If you cannot submit a Tally Log, ensure:
1.  All required fields (Truck, Weights) are filled.
2.  You have a stable internet connection.
