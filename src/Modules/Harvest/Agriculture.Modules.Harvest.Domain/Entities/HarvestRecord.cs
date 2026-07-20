using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Harvest.Domain.Entities;

public sealed class HarvestRecord : AuditableEntity
{
    private HarvestRecord() { }

    public Guid SeasonId { get; private set; }
    public Guid ProducerId { get; private set; }
    public Guid LandId { get; private set; }
    public Guid? ProductionWorkflowId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public decimal Quantity { get; private set; }
    public string Unit { get; private set; } = "kg";
    public DateOnly HarvestDate { get; private set; }
    public string? Notes { get; private set; }

    /// <summary>Buyer name or organization (alıcı). TRY sale assumed.</summary>
    public string? BuyerName { get; private set; }

    /// <summary>Unit price paid (birim fiyat), TRY.</summary>
    public decimal? UnitPrice { get; private set; }

    /// <summary>Total amount paid (toplam tutar), TRY. Often UnitPrice × Quantity.</summary>
    public decimal? TotalAmount { get; private set; }

    public static HarvestRecord Create(
        Guid seasonId,
        Guid producerId,
        Guid landId,
        string productName,
        decimal quantity,
        DateOnly harvestDate,
        string unit = "kg",
        Guid? productionWorkflowId = null,
        string? notes = null,
        string? buyerName = null,
        decimal? unitPrice = null,
        decimal? totalAmount = null)
    {
        var normalizedBuyer = string.IsNullOrWhiteSpace(buyerName) ? null : buyerName.Trim();
        var resolvedTotal = ResolveTotalAmount(quantity, unitPrice, totalAmount);

        return new HarvestRecord
        {
            SeasonId = seasonId,
            ProducerId = producerId,
            LandId = landId,
            ProductName = productName.Trim(),
            Quantity = quantity,
            HarvestDate = harvestDate,
            Unit = unit,
            ProductionWorkflowId = productionWorkflowId,
            Notes = notes,
            BuyerName = normalizedBuyer,
            UnitPrice = unitPrice,
            TotalAmount = resolvedTotal
        };
    }

    private static decimal? ResolveTotalAmount(decimal quantity, decimal? unitPrice, decimal? totalAmount)
    {
        if (totalAmount.HasValue)
            return totalAmount;
        if (unitPrice.HasValue)
            return Math.Round(unitPrice.Value * quantity, 2, MidpointRounding.AwayFromZero);
        return null;
    }
}

public sealed class DeliveryRecord : AuditableEntity
{
    private DeliveryRecord() { }

    public Guid HarvestRecordId { get; private set; }
    public Guid ProducerId { get; private set; }
    public decimal Quantity { get; private set; }
    public string Unit { get; private set; } = "kg";
    public DateOnly DeliveryDate { get; private set; }
    public string? Destination { get; private set; }
    public string? Notes { get; private set; }

    public static DeliveryRecord Create(
        Guid harvestRecordId,
        Guid producerId,
        decimal quantity,
        DateOnly deliveryDate,
        string unit = "kg",
        string? destination = null,
        string? notes = null)
    {
        return new DeliveryRecord
        {
            HarvestRecordId = harvestRecordId,
            ProducerId = producerId,
            Quantity = quantity,
            DeliveryDate = deliveryDate,
            Unit = unit,
            Destination = destination,
            Notes = notes
        };
    }
}
