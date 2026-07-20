using Agriculture.Modules.Communication.Domain.Entities;

namespace Agriculture.Modules.Communication.Application.Abstractions;

public interface IConversationRepository
{
    Task<Conversation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetByParticipantAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Conversation>> GetForOfficerAsync(Guid officerUserId, CancellationToken cancellationToken = default);
    Task<Conversation?> GetOpenExpertThreadAsync(
        Guid producerUserId,
        Guid? landId = null,
        CancellationToken cancellationToken = default);
    Task<Conversation?> GetOpenStaffThreadAsync(
        Guid adminUserId,
        Guid officerUserId,
        CancellationToken cancellationToken = default);
    Task AddAsync(Conversation conversation, CancellationToken cancellationToken = default);
    void MarkMessageAdded(ChatMessage message);
    void Update(Conversation conversation);
}
