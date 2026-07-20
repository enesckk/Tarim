# Aggregate Design Document

# Agriculture Management System

Version: 1.0

Status: Draft

---

# Purpose

This document defines the Aggregate structure of the Agriculture Management System following Domain Driven Design (DDD) principles.

The purpose of this document is to determine transaction boundaries, consistency rules and ownership of business objects before database implementation.

Every Aggregate must protect its own consistency.

Every Aggregate has only one Aggregate Root.

External modules communicate only through Aggregate Roots.

---

# What is an Aggregate?

An Aggregate is a cluster of related business objects treated as a single unit.

Rules

• One Aggregate Root

• One Transaction Boundary

• One Business Responsibility

• Internal consistency is guaranteed

• External objects never modify child entities directly

---

# Aggregate 1

User

Aggregate Root

User

Purpose

Represents every authenticated user inside the platform.

Child Entities

RefreshToken

LoginHistory

PasswordHistory

AssignedRole

PermissionOverride

Owned Value Objects

Email

PhoneNumber

FullName

Address

Invariants

Email must be unique.

Username must be unique.

Deleted users cannot login.

Only active users may receive JWT.

Password must always be hashed.

Allowed Operations

Register

Update

Deactivate

AssignRole

RemoveRole

ChangePassword

ResetPassword

GenerateRefreshToken

RevokeRefreshToken

Business Events

UserCreated

UserUpdated

UserDeleted

RoleAssigned

RoleRemoved

PasswordChanged

UserLoggedIn

UserLoggedOut

Transaction Boundary

Entire User Aggregate

---

# Aggregate 2

Producer

Aggregate Root

Producer

Purpose

Represents an agricultural producer.

Child Entities

ProducerPhoto

ProducerDocument

ProducerAddress

ProducerContact

ProducerSeason

SupportHistory

InspectionHistory

HarvestHistory

Value Objects

IdentityNumber

Phone

Email

Address

BankInformation

Invariants

Identity Number is unique.

Producer must be active.

Producer cannot own duplicated land assignments.

Producer cannot participate in two active seasons for the same land.

Allowed Operations

RegisterProducer

UpdateProducer

AssignLand

AssignSeason

DeactivateProducer

ApproveSupport

RejectSupport

Business Events

ProducerRegistered

ProducerUpdated

ProducerAssignedLand

ProducerAssignedSeason

ProducerDeactivated

SupportApproved

SupportRejected

Transaction Boundary

Entire Producer Aggregate

---

# Aggregate 3

Land

Aggregate Root

Land

Purpose

Represents agricultural land.

Child Entities

Coordinates

Photos

OwnershipHistory

Documents

CropHistory

Value Objects

ParcelNumber

Area

Location

SoilInformation

Invariants

Parcel number must be unique.

Area cannot be zero.

Archived lands cannot receive new seasons.

Allowed Operations

RegisterLand

UpdateLand

ArchiveLand

AssignProducer

AssignSeason

Business Events

LandRegistered

LandUpdated

LandArchived

ProducerAssigned

SeasonAssigned

Transaction Boundary

Entire Land Aggregate

---

# Aggregate 4

Season

Aggregate Root

Season

Purpose

Represents one agricultural production season.

Child Entities

SeasonCalendar

SeasonConfiguration

SeasonWorkflow

Value Objects

SeasonName

SeasonPeriod

SeasonStatus

Invariants

Only one active season per land.

Completed seasons become read-only.

Archived seasons cannot be modified.

Allowed Operations

CreateSeason

StartSeason

PauseSeason

CompleteSeason

ArchiveSeason

AssignWorkflow

Business Events

SeasonCreated

SeasonStarted

SeasonCompleted

SeasonArchived

WorkflowAssigned

Transaction Boundary

Entire Season Aggregate

---

# Aggregate 5

Workflow

Aggregate Root

Workflow

Purpose

Represents the production process.

Child Entities

WorkflowStep

WorkflowCondition

WorkflowRule

WorkflowVersion

Value Objects

WorkflowStatus

WorkflowType

Invariants

Workflow must contain at least one step.

Workflow steps must be ordered.

Workflow cannot skip steps.

Deleted workflow cannot start.

Allowed Operations

CreateWorkflow

PublishWorkflow

ArchiveWorkflow

AssignWorkflow

StartWorkflow

CompleteWorkflow

Business Events

WorkflowCreated

WorkflowPublished

WorkflowAssigned

WorkflowCompleted

WorkflowArchived

Transaction Boundary

Entire Workflow Aggregate

---

# Aggregate 6

Task

Aggregate Root

Task

Purpose

Represents work assigned to producers.

Child Entities

TaskPhoto

TaskAttachment

TaskComment

ReminderHistory

Value Objects

DueDate

Priority

Status

CompletionTime

Invariants

Completed tasks cannot return to Pending.

Cancelled tasks cannot restart.

Future workflow steps cannot create tasks.

Allowed Operations

AssignTask

StartTask

CompleteTask

CancelTask

DelayTask

AddPhoto

AddComment

Business Events

TaskAssigned

TaskStarted

TaskCompleted

TaskCancelled

TaskDelayed

ReminderSent

Transaction Boundary

Entire Task Aggregate

---

# Aggregate 7

Inspection

Aggregate Root

Inspection

Purpose

Represents municipality field inspection.

Child Entities

InspectionFinding

InspectionPhoto

InspectionComment

InspectionDocument

Value Objects

InspectionDate

Inspector

InspectionStatus

Invariants

Inspection cannot be edited after completion.

Every inspection must belong to one task or workflow.

Allowed Operations

AssignInspection

StartInspection

CompleteInspection

RejectInspection

Business Events

InspectionCreated

InspectionAssigned

InspectionCompleted

InspectionRejected

Transaction Boundary

Entire Inspection Aggregate

---

# Aggregate 8

Harvest

Aggregate Root

Harvest

Purpose

Represents harvesting.

Child Entities

HarvestProduct

HarvestPhoto

HarvestMeasurement

Value Objects

HarvestDate

HarvestAmount

HarvestUnit

Invariants

Harvest cannot begin before workflow completion.

Harvest amount cannot be negative.

Allowed Operations

StartHarvest

CompleteHarvest

CancelHarvest

Business Events

HarvestStarted

HarvestCompleted

HarvestCancelled

Transaction Boundary

Entire Harvest Aggregate

---

# Aggregate 9

Delivery

Aggregate Root

Delivery

Purpose

Represents delivery operations.

Child Entities

Invoice

Receipt

DeliveryDocument

Value Objects

DeliveryDate

Buyer

Quantity

Price

Invariants

Harvest must exist.

Quantity cannot exceed harvest amount.

Allowed Operations

CreateDelivery

CompleteDelivery

CancelDelivery

Business Events

DeliveryCreated

DeliveryCompleted

DeliveryCancelled

Transaction Boundary

Entire Delivery Aggregate

---

# Aggregate Communication Rules

Aggregates never communicate directly.

Communication always occurs through:

Application Layer

↓

Domain Events

↓

Repositories

Never reference child entities from another Aggregate.

Only Aggregate Roots may be referenced.

---

# Aggregate Size Principles

Aggregates should remain small.

Large aggregates reduce performance.

Large aggregates increase locking.

Large aggregates decrease scalability.

Each Aggregate should represent exactly one business consistency boundary.

---

# Final Decision

Database tables will NOT determine Aggregates.

Aggregates determine database tables.

Business rules determine Aggregates.

Technology never determines the domain.
