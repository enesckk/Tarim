# Event Storming Document

# Agriculture Management System

Version: 1.0

Status: Draft

---

# Purpose

This document models the business behavior of the Agriculture Management System using Event Storming principles.

The goal is to identify every Business Event, Command, Policy, Read Model and External Actor before implementation.

The system is event-driven at the business level.

Every important business action creates one or more Domain Events.

These events trigger workflows, notifications and background jobs.

---

# Event Storming Legend

Orange  : Domain Event

Blue    : Command

Purple  : Policy

Green   : Read Model

Yellow  : External Actor

Pink    : External System

---

# Main Business Flow

Municipality

↓

Register Producer

↓

Producer Registered

↓

Register Land

↓

Land Registered

↓

Create Season

↓

Season Created

↓

Assign Workflow

↓

Workflow Assigned

↓

Generate Tasks

↓

Task Created

↓

Task Assigned

↓

Producer Completes Task

↓

Task Completed

↓

Workflow Step Completed

↓

Generate Next Task

↓

Inspection Required?

↓

Inspection Created

↓

Inspection Completed

↓

Workflow Completed

↓

Harvest Started

↓

Harvest Completed

↓

Delivery Created

↓

Delivery Completed

↓

Season Completed

---

# DOMAIN

Identity

---

External Actor

Administrator

---

Commands

Register User

Update User

Deactivate User

Assign Role

Remove Role

Login

Logout

Refresh Token

---

Domain Events

User Registered

User Updated

User Deactivated

Role Assigned

Role Removed

User Logged In

User Logged Out

Password Changed

Refresh Token Created

Refresh Token Revoked

---

Policies

After User Registered

↓

Send Welcome Notification

After Password Changed

↓

Revoke Previous Tokens

---

Read Models

Users List

Active Users

Role List

Permission Matrix

Audit Log

---

# DOMAIN

Producer

---

Commands

Register Producer

Update Producer

Assign Land

Assign Season

Deactivate Producer

Approve Support

Reject Support

---

Events

Producer Registered

Producer Updated

Producer Assigned Land

Producer Assigned Season

Producer Deactivated

Support Approved

Support Rejected

---

Policies

After Producer Registered

↓

Create Mobile Account

↓

Send Welcome Notification

↓

Generate Initial Dashboard

---

Read Models

Producer Detail

Producer Summary

Support History

Season History

Harvest History

---

# DOMAIN

Land

---

Commands

Register Land

Update Land

Archive Land

Assign Producer

Assign Season

---

Events

Land Registered

Land Updated

Land Archived

Producer Assigned

Season Assigned

---

Policies

After Land Registered

↓

Generate GIS Record

↓

Initialize Crop History

---

Read Models

Land Detail

Land Map

Land Statistics

Crop History

---

# DOMAIN

Season

---

Commands

Create Season

Start Season

Pause Season

Complete Season

Archive Season

Assign Workflow

---

Events

Season Created

Season Started

Season Paused

Season Completed

Workflow Assigned

---

Policies

After Season Started

↓

Generate Initial Workflow

↓

Create First Tasks

↓

Notify Producer

---

Read Models

Season Dashboard

Season Timeline

Season Status

---

# DOMAIN

Workflow

---

Commands

Create Workflow

Publish Workflow

Assign Workflow

Archive Workflow

Start Workflow

Complete Workflow

---

Events

Workflow Created

Workflow Published

Workflow Assigned

Workflow Started

Workflow Completed

---

Policies

After Workflow Started

↓

Generate Workflow Steps

↓

Generate First Tasks

After Workflow Completed

↓

Start Harvest Process

---

Read Models

Workflow Detail

Workflow Progress

Workflow Statistics

---

# DOMAIN

Task

---

Commands

Assign Task

Start Task

Complete Task

Cancel Task

Delay Task

Upload Photo

Add Comment

---

Events

Task Assigned

Task Started

Task Completed

Task Delayed

Task Cancelled

Photo Uploaded

Comment Added

Reminder Sent

---

Policies

Task Due Tomorrow

↓

Reminder Notification

Task Overdue

↓

Send Push Notification

↓

Notify Municipality

↓

Create Inspection

Task Completed

↓

Generate Next Workflow Task

---

Read Models

Today's Tasks

Pending Tasks

Completed Tasks

Delayed Tasks

Task Timeline

---

# DOMAIN

Inspection

---

Commands

Create Inspection

Assign Inspector

Start Inspection

Complete Inspection

Reject Inspection

Upload Evidence

---

Events

Inspection Created

Inspector Assigned

Inspection Started

Inspection Completed

Inspection Failed

Evidence Uploaded

---

Policies

Inspection Failed

↓

Pause Workflow

↓

Notify Administrator

Inspection Passed

↓

Resume Workflow

---

Read Models

Inspection Dashboard

Inspection History

Inspection Detail

---

# DOMAIN

Harvest

---

Commands

Start Harvest

Complete Harvest

Cancel Harvest

Record Quantity

Upload Photos

---

Events

Harvest Started

Harvest Completed

Harvest Cancelled

Quantity Recorded

Harvest Photo Uploaded

---

Policies

Harvest Completed

↓

Create Delivery Record

↓

Notify Municipality

---

Read Models

Harvest Detail

Harvest History

Harvest Statistics

---

# DOMAIN

Delivery

---

Commands

Create Delivery

Complete Delivery

Cancel Delivery

Generate Receipt

---

Events

Delivery Created

Delivery Completed

Delivery Cancelled

Receipt Generated

---

Policies

Delivery Completed

↓

Complete Season

↓

Generate Reports

---

Read Models

Delivery Dashboard

Delivery History

Delivery Statistics

---

# Notification Events

Task Reminder

Inspection Reminder

Harvest Reminder

Delivery Reminder

Support Approved

Support Rejected

Workflow Started

Workflow Completed

Season Completed

---

# Background Jobs

Daily Reminder Job

Weekly Report Job

Notification Dispatcher

Task Deadline Checker

Inspection Scheduler

Harvest Reminder

Archive Completed Seasons

Cleanup Old Notifications

---

# External Systems

Firebase Cloud Messaging

SignalR

MinIO

SQL Server

Hangfire

---

# Event Ordering Rules

Every Command creates zero or more Domain Events.

Every Domain Event may trigger Policies.

Policies may generate Commands.

Commands modify Aggregates.

Read Models are updated asynchronously.

No UI directly modifies the database.

Every business operation begins with a Command.

Every business result ends with a Domain Event.

---

# Final Decision

The Agriculture Management System is workflow-driven.

Business Events are the backbone of the platform.

Every new feature must define:

- Command
- Domain Event
- Policy
- Read Model

before implementation begins.
