# System Requirements Specification (SRS)

# Agriculture Management System

Version: 1.0

Status: Draft

---

# 1. Introduction

## 1.1 Purpose

This document defines all functional and non-functional requirements of the Agriculture Management System.

This document serves as the main reference before software architecture and implementation begin.

Every feature implemented during development must be traceable back to this specification.

---

## 1.2 Intended Audience

• Product Owner

• Business Analysts

• Software Architects

• Backend Developers

• Frontend Developers

• Mobile Developers

• QA Engineers

---

## 1.3 Project Goal

The Agriculture Management System aims to digitize the complete agricultural production lifecycle managed by municipalities.

The platform provides centralized management for agricultural operations while simplifying mobile interaction for producers.

---

# 2. Business Background

Municipalities currently manage agricultural operations using spreadsheets, paper forms and manual communication.

Current problems include:

• Missing production records

• Difficult task tracking

• Poor communication

• Manual reporting

• Lack of inspection history

• No centralized workflow

The new platform solves these problems by introducing digital workflows.

---

# 3. System Scope

The platform manages:

• Producers

• Agricultural Lands

• Seasons

• Production Workflows

• Workflow Steps

• Tasks

• Inspections

• Agricultural Supports

• Harvests

• Deliveries

• Notifications

• Messaging

• Reports

---

# 4. Actors

## Administrator

Description

Municipality employee responsible for managing the platform.

Permissions

- Full access

Responsibilities

- Manage users

- Configure workflows

- Monitor production

- View reports

---

## Producer

Description

Citizen registered by municipality.

Permissions

Only own data.

Responsibilities

- Complete tasks

- Upload photos

- Receive notifications

- Request support

---

## Inspector

Description

Municipality employee responsible for inspections.

Responsibilities

- Visit lands

- Upload reports

- Attach evidence

- Complete inspections

---

# 5. Functional Requirements

## Authentication

The system shall allow secure authentication.

Features

• Login

• Logout

• Refresh Token

• JWT

---

## User Management

Administrator shall

Create user

Update user

Deactivate user

Assign roles

Reset passwords

---

## Producer Management

Administrator shall

Register producer

Update producer

Deactivate producer

Assign land

View production history

---

## Land Management

Each land shall contain

Parcel Number

Area

Location

Coordinates

Ownership

Soil Type

Notes

Photos

Status

---

## Season Management

Administrator shall

Create season

Start season

Pause season

Complete season

Archive season

---

## Workflow Management

Administrator shall

Create workflow

Update workflow

Delete workflow

Assign workflow

Activate workflow

Deactivate workflow

---

## Workflow Step

Each workflow consists of ordered steps.

Example

Land Preparation

↓

Planting

↓

Irrigation

↓

Fertilization

↓

Inspection

↓

Harvest

↓

Delivery

Each step may generate one or multiple tasks.

---

## Task Management

Each task contains

Title

Description

Due Date

Priority

Status

Assigned Producer

Photos

Attachments

Completion Time

Notes

The system automatically generates tasks according to workflow rules.

---

## Inspection

Administrator may create inspection.

Inspector receives notification.

Inspection contains

Inspection Date

Inspector

Findings

Photos

GPS (optional)

Comments

Status

---

## Harvest

Harvest contains

Harvest Date

Crop Type

Quantity

Unit

Photos

Notes

---

## Delivery

Delivery contains

Delivery Date

Buyer

Quantity

Price

Receipt

Notes

---

## Notification System

Notification Types

Task Reminder

Inspection Assignment

Workflow Started

Workflow Completed

Support Approved

Harvest Reminder

Delivery Reminder

System Notification

---

## Messaging

Administrator ↔ Producer

Administrator ↔ Inspector

Internal messaging only.

---

## Reporting

Reports

Production Report

Producer Report

Land Report

Season Report

Inspection Report

Harvest Report

Support Report

Task Performance Report

Dashboard

---

# 6. Non Functional Requirements

Performance

Average API response under 300 ms.

Availability

99.9%

Security

JWT

HTTPS

Audit Logs

Rate Limiting

Maintainability

Clean Architecture

CQRS

DDD Principles

Scalability

Modular Monolith

Prepared for future Microservices.

Logging

Serilog

Monitoring

Seq

Storage

MinIO

Background Jobs

Hangfire

Realtime

SignalR

---

# 7. Business Rules

A producer cannot complete future workflow steps.

Workflow steps must be completed sequentially.

Completed seasons cannot be modified.

Tasks generate reminders automatically.

Inspection may block workflow progression.

Harvest cannot start before workflow completion.

Delivery cannot occur before harvest.

---

# 8. Constraints

No public registration.

Users are created only by municipality.

Only authenticated users access the system.

Every operation is logged.

Every entity supports soft delete.

Every entity supports audit fields.

---

# 9. Success Criteria

The project succeeds if

• Production is fully digital.

• Every producer uses the mobile application.

• Workflow automation replaces manual tracking.

• Reporting becomes automatic.

• Inspection process becomes paperless.

• All activities become traceable.
