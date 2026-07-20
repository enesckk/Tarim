using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Harvest.Domain.Entities;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Domain.Entities;
using Microsoft.EntityFrameworkCore;

internal static partial class DatabaseInitializer
{
    public static readonly Guid SehitkamilSeasonId = Guid.Parse("a6666666-6666-6666-6666-666666666601");

    // Extra demo producers (Mehmet Çiftçi = DemoProducerId already seeded).
    public static readonly Guid SkProducerHasanId = Guid.Parse("a3333333-3333-3333-3333-333333333301");
    public static readonly Guid SkProducerFatmaId = Guid.Parse("a3333333-3333-3333-3333-333333333302");
    public static readonly Guid SkProducerAhmetId = Guid.Parse("a3333333-3333-3333-3333-333333333303");
    public static readonly Guid SkProducerZeynepId = Guid.Parse("a3333333-3333-3333-3333-333333333304");

    /// <summary>
    /// Idempotent Şehitkamil demo: 15 lands (SK-DEMO-01…15), mixed crops, workflows, tasks, map statuses.
    /// Creates missing parcels once; always runs a repair path for coords / uzman / producer assignments.
    /// </summary>
    public static async Task SeedSehitkamilDemoDataAsync(AgricultureDbContext db)
    {
        await EnsureSehitkamilProducersAsync(db);

        if (!await db.Seasons.AnyAsync(s => s.Id == SehitkamilSeasonId))
        {
            var season = Season.Create(
                "2026 Şehitkamil Sezonu",
                2026,
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-21)),
                "Gaziantep / Şehitkamil demo üretim sezonu");
            season.Start();
            SetEntityId(season, SehitkamilSeasonId);
            await db.Seasons.AddAsync(season);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var defs = GetSehitkamilLandDefinitions();

        foreach (var def in defs)
        {
            var land = await db.Lands.FirstOrDefaultAsync(l => l.ParcelNumber == def.ParcelNumber);
            if (land is null)
            {
                await CreateSehitkamilLandBundleAsync(db, def, today);
            }
            else
            {
                RepairSehitkamilLandAssignments(land, def);
            }
        }

        await db.SaveChangesAsync();
    }

    private static async Task CreateSehitkamilLandBundleAsync(
        AgricultureDbContext db,
        SkLandDef def,
        DateOnly today)
    {
        var land = Land.Create(
            def.Name,
            def.ParcelNumber,
            def.SizeInDecares,
            latitude: def.Latitude,
            longitude: def.Longitude,
            city: "Gaziantep",
            district: "Şehitkamil",
            neighborhood: def.Neighborhood);
        land.AssignProducer(def.ProducerId);
        land.AssignOfficer(def.OfficerUserId);
        SetEntityId(land, def.LandId);
        await db.Lands.AddAsync(land);

        if (!await db.Workflows.AnyAsync(w => w.Id == def.WorkflowId))
        {
            var workflow = Workflow.Create(
                $"{def.Crop} üretim akışı (Şehitkamil)",
                $"Demo iş akışı — {def.Neighborhood} / {def.Crop}",
                cropType: def.Crop);
            SetEntityId(workflow, def.WorkflowId);
            var stepDefs = GetCropSteps(def.Crop);
            for (var i = 0; i < stepDefs.Count; i++)
            {
                var step = stepDefs[i];
                workflow.AddStep(
                    step.Name,
                    step.Description,
                    i + 1,
                    dueDaysFromStart: step.DueDaysFromStart,
                    requiresPhoto: step.RequiresPhoto);
            }

            workflow.Activate();
            await db.Workflows.AddAsync(workflow);

            var production = ProductionWorkflow.Assign(
                SehitkamilSeasonId, def.WorkflowId, def.ProducerId, def.LandId);
            production.Start();
            SetEntityId(production, def.ProductionId);
            await db.ProductionWorkflows.AddAsync(production);

            var orderedSteps = workflow.Steps.OrderBy(s => s.Order).ToList();
            var tasks = new List<ProductionTask>();
            foreach (var step in orderedSteps)
            {
                var due = step.DueDaysFromStart is int days
                    ? today.AddDays(days)
                    : today.AddDays(7);
                tasks.Add(ProductionTask.Create(
                    def.ProductionId,
                    def.ProducerId,
                    def.LandId,
                    step.Name,
                    step.Description,
                    step.Id,
                    due,
                    step.RequiresPhoto));
            }

            ApplyMapStatusHint(tasks, def.MapStatusHint, today);
            await db.Tasks.AddRangeAsync(tasks);

            if (def.MapStatusHint == SkMapHint.Harvest)
            {
                await db.HarvestRecords.AddAsync(HarvestRecord.Create(
                    SehitkamilSeasonId,
                    def.ProducerId,
                    def.LandId,
                    def.Crop,
                    quantity: 850m,
                    harvestDate: today.AddDays(-1),
                    unit: "kg",
                    productionWorkflowId: def.ProductionId,
                    notes: "Şehitkamil demo hasat — teslimat bekleniyor",
                    buyerName: "Şehitkamil Hal Komisyonculuğu",
                    unitPrice: 18.50m));
            }
        }
    }

    /// <summary>
    /// Fills missing / stale coords and uzman/producer links without duplicating lands.
    /// </summary>
    private static void RepairSehitkamilLandAssignments(Land land, SkLandDef def)
    {
        land.Update(
            def.Name,
            def.SizeInDecares,
            def.Latitude,
            def.Longitude,
            land.SoilType,
            land.SoilNotes);

        land.AssignProducer(def.ProducerId);
        land.AssignOfficer(def.OfficerUserId);
    }

    private static async Task EnsureSehitkamilProducersAsync(AgricultureDbContext db)
    {
        if (!await db.Producers.AnyAsync(p => p.Id == SkProducerHasanId))
        {
            var p = Producer.Create(
                "Hasan", "Yılmaz", "11111111112", "05551234001",
                "hasan.yilmaz@agriculture.local", "Şehitkamil / Karataş");
            SetEntityId(p, SkProducerHasanId);
            await db.Producers.AddAsync(p);
        }

        if (!await db.Producers.AnyAsync(p => p.Id == SkProducerFatmaId))
        {
            var p = Producer.Create(
                "Fatma", "Kaya", "11111111113", "05551234002",
                "fatma.kaya@agriculture.local", "Şehitkamil / İbrahimli");
            SetEntityId(p, SkProducerFatmaId);
            await db.Producers.AddAsync(p);
        }

        if (!await db.Producers.AnyAsync(p => p.Id == SkProducerAhmetId))
        {
            var p = Producer.Create(
                "Ahmet", "Demir", "11111111114", "05551234003",
                "ahmet.demir@agriculture.local", "Şehitkamil / Onur");
            SetEntityId(p, SkProducerAhmetId);
            await db.Producers.AddAsync(p);
        }

        if (!await db.Producers.AnyAsync(p => p.Id == SkProducerZeynepId))
        {
            var p = Producer.Create(
                "Zeynep", "Öztürk", "11111111115", "05551234004",
                "zeynep.ozturk@agriculture.local", "Şehitkamil / Atatürk");
            SetEntityId(p, SkProducerZeynepId);
            await db.Producers.AddAsync(p);
        }
    }

    /// <summary>
    /// Tweaks the first open task due date so the ops map shows the intended marker color.
    /// Remaining steps stay in the near future so the land does not look empty.
    /// </summary>
    private static void ApplyMapStatusHint(
        List<ProductionTask> tasks,
        SkMapHint hint,
        DateOnly today)
    {
        if (tasks.Count == 0)
            return;

        // Ensure later steps are not accidentally overdue/today unless intended.
        for (var i = 1; i < tasks.Count; i++)
            SetTaskDueDate(tasks[i], today.AddDays(5 + i));

        switch (hint)
        {
            case SkMapHint.Critical:
                SetTaskDueDate(tasks[0], today.AddDays(-3));
                break;
            case SkMapHint.Today:
                SetTaskDueDate(tasks[0], today);
                break;
            case SkMapHint.Harvest:
                // No open overdue/today — harvest marker wins when undelivered qty exists.
                SetTaskDueDate(tasks[0], today.AddDays(10));
                break;
            default:
                SetTaskDueDate(tasks[0], today.AddDays(4));
                break;
        }
    }

    private static void SetTaskDueDate(ProductionTask task, DateOnly due)
    {
        typeof(ProductionTask)
            .GetProperty(nameof(ProductionTask.DueDate))!
            .SetValue(task, due);
    }

    private static IReadOnlyList<SkLandDef> GetSehitkamilLandDefinitions() =>
    [
        // Officer rotation: uzman1 / uzman2 / uzman3 across the 15 parcels.
        new("SK-DEMO-01", "Şehitkamil – Karataş Tarlası 1", "Karataş", "Domates",
            8.5m, 37.0782, 37.3821, DemoProducerId, DemoOfficer1UserId, SkMapHint.Critical,
            Guid.Parse("a4444444-4444-4444-4444-444444444401"),
            Guid.Parse("a7777777-7777-7777-7777-777777777701"),
            Guid.Parse("a5555555-5555-5555-5555-555555555501")),
        new("SK-DEMO-02", "Şehitkamil – İbrahimli Tarlası 1", "İbrahimli", "Biber",
            6.2m, 37.0915, 37.4014, SkProducerHasanId, DemoOfficer2UserId, SkMapHint.Today,
            Guid.Parse("a4444444-4444-4444-4444-444444444402"),
            Guid.Parse("a7777777-7777-7777-7777-777777777702"),
            Guid.Parse("a5555555-5555-5555-5555-555555555502")),
        new("SK-DEMO-03", "Şehitkamil – Onur Tarlası 1", "Onur", "Patlıcan",
            11.0m, 37.0658, 37.3652, SkProducerFatmaId, DemoOfficer3UserId, SkMapHint.Normal,
            Guid.Parse("a4444444-4444-4444-4444-444444444403"),
            Guid.Parse("a7777777-7777-7777-7777-777777777703"),
            Guid.Parse("a5555555-5555-5555-5555-555555555503")),
        new("SK-DEMO-04", "Şehitkamil – Atatürk Tarlası 1", "Atatürk", "Mısır",
            22.4m, 37.1047, 37.4189, SkProducerAhmetId, DemoOfficer1UserId, SkMapHint.Critical,
            Guid.Parse("a4444444-4444-4444-4444-444444444404"),
            Guid.Parse("a7777777-7777-7777-7777-777777777704"),
            Guid.Parse("a5555555-5555-5555-5555-555555555504")),
        new("SK-DEMO-05", "Şehitkamil – Güneş Mahallesi Tarlası", "Güneş", "Buğday",
            35.0m, 37.0451, 37.3410, SkProducerZeynepId, DemoOfficer2UserId, SkMapHint.Normal,
            Guid.Parse("a4444444-4444-4444-4444-444444444405"),
            Guid.Parse("a7777777-7777-7777-7777-777777777705"),
            Guid.Parse("a5555555-5555-5555-5555-555555555505")),
        new("SK-DEMO-06", "Şehitkamil – Beylerbeyi Tarlası", "Beylerbeyi", "Pamuk",
            28.7m, 37.1186, 37.3795, DemoProducerId, DemoOfficer3UserId, SkMapHint.Today,
            Guid.Parse("a4444444-4444-4444-4444-444444444406"),
            Guid.Parse("a7777777-7777-7777-7777-777777777706"),
            Guid.Parse("a5555555-5555-5555-5555-555555555506")),
        new("SK-DEMO-07", "Şehitkamil – Aydınlar Tarlası", "Aydınlar", "Antep fıstığı",
            18.3m, 37.0554, 37.4528, SkProducerHasanId, DemoOfficer1UserId, SkMapHint.Harvest,
            Guid.Parse("a4444444-4444-4444-4444-444444444407"),
            Guid.Parse("a7777777-7777-7777-7777-777777777707"),
            Guid.Parse("a5555555-5555-5555-5555-555555555507")),
        new("SK-DEMO-08", "Şehitkamil – 75. Yıl Tarlası", "75. Yıl", "Zeytin",
            14.6m, 37.0883, 37.3124, SkProducerFatmaId, DemoOfficer2UserId, SkMapHint.Normal,
            Guid.Parse("a4444444-4444-4444-4444-444444444408"),
            Guid.Parse("a7777777-7777-7777-7777-777777777708"),
            Guid.Parse("a5555555-5555-5555-5555-555555555508")),
        new("SK-DEMO-09", "Şehitkamil – Karacaahmet Tarlası", "Karacaahmet", "Karpuz",
            9.8m, 37.0362, 37.3917, SkProducerAhmetId, DemoOfficer3UserId, SkMapHint.Critical,
            Guid.Parse("a4444444-4444-4444-4444-444444444409"),
            Guid.Parse("a7777777-7777-7777-7777-777777777709"),
            Guid.Parse("a5555555-5555-5555-5555-555555555509")),
        new("SK-DEMO-10", "Şehitkamil – Belkız Tarlası", "Belkız", "Kavun",
            7.4m, 37.1120, 37.3488, SkProducerZeynepId, DemoOfficer1UserId, SkMapHint.Today,
            Guid.Parse("a4444444-4444-4444-4444-444444444410"),
            Guid.Parse("a7777777-7777-7777-7777-777777777710"),
            Guid.Parse("a5555555-5555-5555-5555-555555555510")),
        new("SK-DEMO-11", "Şehitkamil – Eyüpsultan Tarlası", "Eyüpsultan", "Fasulye",
            5.5m, 37.0711, 37.4286, DemoProducerId, DemoOfficer2UserId, SkMapHint.Normal,
            Guid.Parse("a4444444-4444-4444-4444-444444444411"),
            Guid.Parse("a7777777-7777-7777-7777-777777777711"),
            Guid.Parse("a5555555-5555-5555-5555-555555555511")),
        new("SK-DEMO-12", "Şehitkamil – Çıksorut Tarlası", "Çıksorut", "Nohut",
            16.2m, 37.0964, 37.2915, SkProducerHasanId, DemoOfficer3UserId, SkMapHint.Normal,
            Guid.Parse("a4444444-4444-4444-4444-444444444412"),
            Guid.Parse("a7777777-7777-7777-7777-777777777712"),
            Guid.Parse("a5555555-5555-5555-5555-555555555512")),
        new("SK-DEMO-13", "Şehitkamil – Güzelvadi Tarlası", "Güzelvadi", "Soğan",
            12.1m, 37.0248, 37.3683, SkProducerFatmaId, DemoOfficer1UserId, SkMapHint.Critical,
            Guid.Parse("a4444444-4444-4444-4444-444444444413"),
            Guid.Parse("a7777777-7777-7777-7777-777777777713"),
            Guid.Parse("a5555555-5555-5555-5555-555555555513")),
        new("SK-DEMO-14", "Şehitkamil – Dumlupınar Tarlası", "Dumlupınar", "Sarımsak",
            4.9m, 37.1295, 37.4092, SkProducerAhmetId, DemoOfficer2UserId, SkMapHint.Today,
            Guid.Parse("a4444444-4444-4444-4444-444444444414"),
            Guid.Parse("a7777777-7777-7777-7777-777777777714"),
            Guid.Parse("a5555555-5555-5555-5555-555555555514")),
        new("SK-DEMO-15", "Şehitkamil – Akkent Tarlası", "Akkent", "Yonca",
            20.0m, 37.0497, 37.4781, SkProducerZeynepId, DemoOfficer3UserId, SkMapHint.Normal,
            Guid.Parse("a4444444-4444-4444-4444-444444444415"),
            Guid.Parse("a7777777-7777-7777-7777-777777777715"),
            Guid.Parse("a5555555-5555-5555-5555-555555555515")),
    ];

    private static IReadOnlyList<SkStepDef> GetCropSteps(string crop) => crop switch
    {
        "Domates" =>
        [
            new("Toprak hazırlığı", "Tarla sürümü ve yatak hazırlığı.", 0, false),
            new("Fide dikimi", "Domates fidelerini dikin.", 3, true),
            new("Can suyu", "Dikim sonrası can suyu verin.", 4, false),
            new("İlk gübreleme", "Taban gübresi uygulayın.", 10, false),
            new("Budama / sırık", "Sırık bağlama ve koltuk alma.", 18, true),
            new("Sulama kontrolü", "Damla sulama basıncını kontrol edin.", 25, false),
            new("Zararlı tarama", "Yaprak biti / mildiyö kontrolü.", 32, true),
            new("Hasat başlangıcı", "İlk olgun meyveleri toplayın.", 55, true),
        ],
        "Biber" =>
        [
            new("Yatak hazırlığı", "Sıra arası mesafeyi ayarlayın.", 0, false),
            new("Fide dikimi", "Biber fidelerini dikin.", 2, true),
            new("Can suyu", "Dikim sonrası sulama.", 3, false),
            new("Çapalama", "Yabancı ot temizliği.", 12, false),
            new("Gübreleme", "Azot takviyesi.", 20, false),
            new("Hastalık kontrolü", "Yaprak lekesi tarama fotoğrafı.", 28, true),
            new("Hasat", "Olgun biberleri toplayın.", 50, true),
        ],
        "Patlıcan" =>
        [
            new("Toprak işleme", "Derin sürüm.", 0, false),
            new("Fide dikimi", "Patlıcan fidelerini dikin.", 4, true),
            new("Sulama", "Düzenli damla sulama.", 8, false),
            new("Gübreleme", "Kompleks gübre.", 15, false),
            new("Destek bağlama", "Sırık / ip bağlama.", 22, true),
            new("Zararlı kontrolü", "Kırmızı örümcek tarama.", 30, true),
            new("Hasat", "Olgun meyve hasadı.", 48, true),
        ],
        "Mısır" =>
        [
            new("Tarla sürümü", "Ekime hazırlık.", 0, false),
            new("Ekim", "Mısır tohumunu ekin.", 2, false),
            new("Çıkış kontrolü", "Çimlenme oranı fotoğrafı.", 10, true),
            new("Çapalama", "Sıra arası çapa.", 18, false),
            new("Azot gübreleme", "Üst gübre.", 25, false),
            new("Sulama", "Kritik sulama dönemi.", 35, false),
            new("Koçan kontrolü", "Olgunlaşma fotoğrafı.", 70, true),
            new("Hasat", "Mısır hasadı.", 90, false),
        ],
        "Buğday" =>
        [
            new("Tohum yatağı", "İnce tarla hazırlığı.", 0, false),
            new("Ekim", "Buğday ekimi.", 1, false),
            new("Çıkış kontrolü", "Çıkış yoğunluğu.", 14, true),
            new("Yabancı ot ilaçlama", "Herbisit uygulaması.", 30, false),
            new("Üst gübre", "Azot uygulaması.", 45, false),
            new("Hastalık tarama", "Pas / septoria kontrolü.", 60, true),
            new("Hasat", "Biçerdöver hasadı.", 110, false),
        ],
        "Pamuk" =>
        [
            new("Toprak hazırlığı", "Sürüm ve tırmık.", 0, false),
            new("Ekim", "Pamuk ekimi.", 3, false),
            new("Seyreltme", "Sıra üzeri seyreltme.", 20, false),
            new("Çapalama", "Yabancı ot mücadelesi.", 30, false),
            new("İlk ilaçlama", "Zararlı mücadelesi.", 40, false),
            new("Sulama", "Çiçeklenme sulaması.", 55, false),
            new("Koza kontrolü", "Koza olgunluk fotoğrafı.", 90, true),
            new("Hasat", "Pamuk hasadı.", 120, true),
        ],
        "Antep fıstığı" =>
        [
            new("Budama", "Kış budaması.", 0, true),
            new("Toprak işleme", "Çanak açma.", 10, false),
            new("Gübreleme", "Organik + mineral gübre.", 20, false),
            new("Sulama", "Kritik sulama.", 40, false),
            new("Zararlı tarama", "Psillid / içkurdu kontrolü.", 55, true),
            new("Hasat planı", "Hasat ekibi organizasyonu.", 100, false),
            new("Hasat", "Antep fıstığı hasadı.", 110, true),
            new("Kurutma", "Ürün kurutma kontrolü.", 115, true),
        ],
        "Zeytin" =>
        [
            new("Budama", "Şekil budaması.", 0, true),
            new("Gübreleme", "Taban gübresi.", 15, false),
            new("Sulama", "Yaz sulaması.", 40, false),
            new("Zararlı kontrolü", "Zeytin sineği tarama.", 60, true),
            new("Hasat başlangıcı", "Erken hasat numunesi.", 100, true),
            new("Hasat", "Zeytin hasadı.", 110, true),
        ],
        "Karpuz" =>
        [
            new("Yatak hazırlığı", "Sıra ve damla hortumu.", 0, false),
            new("Ekim / fide", "Karpuz ekimi veya dikimi.", 2, true),
            new("Can suyu", "İlk sulama.", 3, false),
            new("Çapalama", "Yabancı ot temizliği.", 15, false),
            new("Gübreleme", "Azot-fosfor dengesi.", 25, false),
            new("Meyve bağlama", "İlk meyve kontrolü.", 40, true),
            new("Hasat", "Olgun karpuz hasadı.", 70, true),
        ],
        "Kavun" =>
        [
            new("Toprak hazırlığı", "Sıra hazırlığı.", 0, false),
            new("Ekim", "Kavun ekimi.", 2, false),
            new("Çıkış kontrolü", "Fide sağlığı fotoğrafı.", 10, true),
            new("Sulama", "Düzenli sulama.", 20, false),
            new("Gübreleme", "Üst gübre.", 30, false),
            new("Olgunluk kontrolü", "Şeker / renk kontrolü.", 55, true),
            new("Hasat", "Kavun hasadı.", 65, true),
        ],
        "Fasulye" =>
        [
            new("Ekim yatağı", "İnce sürüm.", 0, false),
            new("Ekim", "Fasulye ekimi.", 1, false),
            new("Çıkış kontrolü", "Çimlenme fotoğrafı.", 8, true),
            new("Çapalama", "Yabancı ot.", 18, false),
            new("Sulama", "Çiçeklenme sulaması.", 28, false),
            new("Hasat", "Taze / kuru fasulye hasadı.", 55, true),
        ],
        "Nohut" =>
        [
            new("Toprak hazırlığı", "Ekime hazırlık.", 0, false),
            new("Ekim", "Nohut ekimi.", 2, false),
            new("Çıkış kontrolü", "Çıkış yoğunluğu.", 12, true),
            new("Yabancı ot", "Elle / mekanik mücadele.", 25, false),
            new("Hastalık tarama", "Ascochyta kontrolü.", 40, true),
            new("Hasat", "Nohut hasadı.", 85, false),
        ],
        "Soğan" =>
        [
            new("Yatak hazırlığı", "Sıralı yatak.", 0, false),
            new("Dikim / ekim", "Soğan seti veya tohum.", 1, false),
            new("Çıkış kontrolü", "Sıra doluluğu fotoğrafı.", 10, true),
            new("Çapalama", "Yabancı ot temizliği.", 20, false),
            new("Gübreleme", "Azot takviyesi.", 30, false),
            new("Sulama", "Baş bağlama sulaması.", 45, false),
            new("Hasat", "Soğan sökümü.", 90, true),
        ],
        "Sarımsak" =>
        [
            new("Diş hazırlığı", "Tohumluk diş seçimi.", 0, false),
            new("Dikim", "Sarımsak dikimi.", 1, true),
            new("Çıkış kontrolü", "Sürgün kontrolü.", 20, true),
            new("Çapalama", "Yabancı ot.", 40, false),
            new("Gübreleme", "Üst gübre.", 55, false),
            new("Hasat", "Sarımsak sökümü.", 120, true),
            new("Kurutma", "Bağ / sıra kurutma.", 125, true),
        ],
        "Yonca" =>
        [
            new("Tarla hazırlığı", "Tesviye ve sürüm.", 0, false),
            new("Ekim", "Yonca ekimi.", 2, false),
            new("Çıkış kontrolü", "Çıkış yoğunluğu.", 15, true),
            new("İlk biçim", "Biçim zamanı kontrolü.", 45, true),
            new("Sulama", "Biçim sonrası sulama.", 50, false),
            new("İkinci biçim", "İkinci hasat.", 75, true),
            new("Gübreleme", "Fosfor takviyesi.", 80, false),
        ],
        _ =>
        [
            new("Saha hazırlığı", "Genel tarla hazırlığı.", 0, false),
            new("Üretim başlangıcı", "Ekim / dikim.", 2, true),
            new("Bakım", "Sulama ve gübreleme.", 15, false),
            new("Kontrol", "Bitki sağlığı fotoğrafı.", 30, true),
            new("Hasat", "Hasat işlemi.", 60, true),
        ]
    };

    private enum SkMapHint
    {
        Normal,
        Today,
        Critical,
        Harvest
    }

    private sealed record SkLandDef(
        string ParcelNumber,
        string Name,
        string Neighborhood,
        string Crop,
        decimal SizeInDecares,
        double Latitude,
        double Longitude,
        Guid ProducerId,
        Guid OfficerUserId,
        SkMapHint MapStatusHint,
        Guid LandId,
        Guid WorkflowId,
        Guid ProductionId);

    private sealed record SkStepDef(
        string Name,
        string Description,
        int DueDaysFromStart,
        bool RequiresPhoto);
}
