using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Communication.Domain.Entities;

public enum ConversationStatus
{
    Open = 0,
    Closed = 1
}

/// <summary>Expert = producer↔uzman; Staff = admin↔uzman (SDS-R16).</summary>
public enum ConversationType
{
    Expert = 0,
    Staff = 1
}

public sealed class Conversation : AuditableEntity
{
    private readonly List<ChatMessage> _messages = [];

    private Conversation() { }

    public Guid ProducerUserId { get; private set; }
    public Guid? OfficerUserId { get; private set; }
    public Guid? AdminUserId { get; private set; }
    public Guid? LandId { get; private set; }
    public ConversationType Type { get; private set; } = ConversationType.Expert;
    public string Subject { get; private set; } = string.Empty;
    public ConversationStatus Status { get; private set; } = ConversationStatus.Open;
    public DateTime? LastMessageAtUtc { get; private set; }
    public IReadOnlyCollection<ChatMessage> Messages => _messages.AsReadOnly();

    public static Conversation Create(Guid producerUserId, string subject, Guid? officerUserId = null, Guid? landId = null)
    {
        return new Conversation
        {
            Type = ConversationType.Expert,
            ProducerUserId = producerUserId,
            OfficerUserId = officerUserId,
            LandId = landId,
            Subject = string.IsNullOrWhiteSpace(subject) ? "Genel soru" : subject.Trim()
        };
    }

    public static Conversation CreateStaff(Guid adminUserId, Guid officerUserId, string subject)
    {
        return new Conversation
        {
            Type = ConversationType.Staff,
            ProducerUserId = adminUserId,
            AdminUserId = adminUserId,
            OfficerUserId = officerUserId,
            Subject = string.IsNullOrWhiteSpace(subject) ? "Personel yazışması" : subject.Trim()
        };
    }

    public ChatMessage AddMessage(Guid senderUserId, string body)
    {
        var message = ChatMessage.Create(Id, senderUserId, body);
        _messages.Add(message);
        LastMessageAtUtc = message.SentAtUtc;
        UpdatedAtUtc = DateTime.UtcNow;
        return message;
    }

    public void Close()
    {
        Status = ConversationStatus.Closed;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public bool IsParticipant(Guid userId)
        => ProducerUserId == userId
           || OfficerUserId == userId
           || AdminUserId == userId;
}

public sealed class ChatMessage : Entity
{
    private ChatMessage() { }

    public Guid ConversationId { get; private set; }
    public Guid SenderUserId { get; private set; }
    public string Body { get; private set; } = string.Empty;
    public DateTime SentAtUtc { get; private set; } = DateTime.UtcNow;

    public static ChatMessage Create(Guid conversationId, Guid senderUserId, string body)
    {
        return new ChatMessage
        {
            ConversationId = conversationId,
            SenderUserId = senderUserId,
            Body = body.Trim(),
            SentAtUtc = DateTime.UtcNow
        };
    }
}
