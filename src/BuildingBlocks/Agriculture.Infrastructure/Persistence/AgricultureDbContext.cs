using Agriculture.Application.Abstractions.Data;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.Modules.Harvest.Domain.Entities;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.Modules.Support.Domain.Entities;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Domain.Entities;
using Agriculture.SharedKernel.Primitives;
using Microsoft.EntityFrameworkCore;

namespace Agriculture.Infrastructure.Persistence;

public sealed class AgricultureDbContext(DbContextOptions<AgricultureDbContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<Producer> Producers => Set<Producer>();
    public DbSet<ProducerNote> ProducerNotes => Set<ProducerNote>();
    public DbSet<Land> Lands => Set<Land>();
    public DbSet<LandNote> LandNotes => Set<LandNote>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<ProductionWorkflow> ProductionWorkflows => Set<ProductionWorkflow>();
    public DbSet<ProductionTask> Tasks => Set<ProductionTask>();
    public DbSet<TaskPhoto> TaskPhotos => Set<TaskPhoto>();
    public DbSet<Inspection> Inspections => Set<Inspection>();
    public DbSet<InspectionEvidence> InspectionEvidence => Set<InspectionEvidence>();
    public DbSet<HarvestRecord> HarvestRecords => Set<HarvestRecord>();
    public DbSet<DeliveryRecord> DeliveryRecords => Set<DeliveryRecord>();
    public DbSet<SupportProgram> SupportPrograms => Set<SupportProgram>();
    public DbSet<SupportAssignment> SupportAssignments => Set<SupportAssignment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<DevicePushToken> DevicePushTokens => Set<DevicePushToken>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("agriculture");

        modelBuilder.Entity<Producer>(e =>
        {
            e.ToTable("Producers");
            e.HasKey(x => x.Id);
            e.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            e.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            e.Property(x => x.NationalId).HasMaxLength(11).IsRequired();
            e.HasIndex(x => x.NationalId).IsUnique();
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<ProducerNote>(e =>
        {
            e.ToTable("ProducerNotes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Body).HasMaxLength(4000).IsRequired();
            e.HasIndex(x => x.ProducerId);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<Land>(e =>
        {
            e.ToTable("Lands");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.ParcelNumber).HasMaxLength(50).IsRequired();
            e.Property(x => x.SizeInDecares).HasPrecision(18, 2);
            e.HasIndex(x => x.AssignedOfficerUserId);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<LandNote>(e =>
        {
            e.ToTable("LandNotes");
            e.HasKey(x => x.Id);
            e.Property(x => x.Body).HasMaxLength(4000).IsRequired();
            e.HasIndex(x => x.LandId);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<Season>(e =>
        {
            e.ToTable("Seasons");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<Workflow>(e =>
        {
            e.ToTable("Workflows");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasMany(x => x.Steps).WithOne().HasForeignKey(x => x.WorkflowId);
            e.Ignore(x => x.DomainEvents);
            e.Navigation(x => x.Steps).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<WorkflowStep>(e =>
        {
            e.ToTable("WorkflowSteps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.QuantityUnit).HasMaxLength(32);
            e.Property(x => x.Theme).HasMaxLength(32);
            e.Property(x => x.VideoUrl).HasMaxLength(500);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.PlannedEvidenceJson).HasColumnType("nvarchar(max)");
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<ProductionWorkflow>(e =>
        {
            e.ToTable("ProductionWorkflows");
            e.HasKey(x => x.Id);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<ProductionTask>(e =>
        {
            e.ToTable("Tasks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.QuantityUnit).HasMaxLength(32);
            e.Property(x => x.Theme).HasMaxLength(32);
            e.Property(x => x.VideoUrl).HasMaxLength(500);
            e.Property(x => x.ImageUrl).HasMaxLength(500);
            e.Property(x => x.RevisionReason).HasMaxLength(1000);
            e.Property(x => x.PlannedEvidenceJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.EvidenceJson).HasColumnType("nvarchar(max)");
            e.HasIndex(x => new { x.ProducerId, x.Status });
            e.HasIndex(x => new { x.LandId, x.Status });
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(x => x.TaskId);
            e.Ignore(x => x.DomainEvents);
            e.Navigation(x => x.Photos).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<TaskPhoto>(e =>
        {
            e.ToTable("TaskPhotos");
            e.HasKey(x => x.Id);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<Inspection>(e =>
        {
            e.ToTable("Inspections");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasMany(x => x.Evidence).WithOne().HasForeignKey(x => x.InspectionId);
            e.Ignore(x => x.DomainEvents);
            e.Navigation(x => x.Evidence).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<InspectionEvidence>(e =>
        {
            e.ToTable("InspectionEvidence");
            e.HasKey(x => x.Id);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<HarvestRecord>(e =>
        {
            e.ToTable("HarvestRecords");
            e.HasKey(x => x.Id);
            e.Property(x => x.Quantity).HasPrecision(18, 2);
            e.Property(x => x.BuyerName).HasMaxLength(200);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
            e.Property(x => x.TotalAmount).HasPrecision(18, 2);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<DeliveryRecord>(e =>
        {
            e.ToTable("DeliveryRecords");
            e.HasKey(x => x.Id);
            e.Property(x => x.Quantity).HasPrecision(18, 2);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<SupportProgram>(e =>
        {
            e.ToTable("SupportPrograms");
            e.HasKey(x => x.Id);
            e.Property(x => x.Budget).HasPrecision(18, 2);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<SupportAssignment>(e =>
        {
            e.ToTable("SupportAssignments");
            e.HasKey(x => x.Id);
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("Notifications");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Body).HasMaxLength(2000).IsRequired();
            e.Ignore(x => x.DomainEvents);
        });

        modelBuilder.Entity<DevicePushToken>(e =>
        {
            e.ToTable("DevicePushTokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.Token).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Platform).HasMaxLength(32).IsRequired();
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.Token);
            e.Ignore(x => x.DomainEvents);
        });

        // Communication schema (SDS) — temporarily hosted in shared AgricultureDbContext (Part J bridge).
        modelBuilder.Entity<Conversation>(e =>
        {
            e.ToTable("Conversations", "communication");
            e.HasKey(x => x.Id);
            e.Property(x => x.Subject).HasMaxLength(200).IsRequired();
            e.Property(x => x.Type).HasConversion<int>();
            e.HasIndex(x => x.LandId);
            e.HasIndex(x => x.OfficerUserId);
            e.HasMany(x => x.Messages).WithOne().HasForeignKey(x => x.ConversationId);
            e.Ignore(x => x.DomainEvents);
            e.Navigation(x => x.Messages).UsePropertyAccessMode(PropertyAccessMode.Field);
        });

        modelBuilder.Entity<ChatMessage>(e =>
        {
            e.ToTable("Messages", "communication");
            e.HasKey(x => x.Id);
            e.Property(x => x.Body).HasMaxLength(4000).IsRequired();
            e.Ignore(x => x.DomainEvents);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
