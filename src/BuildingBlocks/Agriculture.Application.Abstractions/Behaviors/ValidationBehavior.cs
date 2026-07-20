using Agriculture.SharedKernel.Results;
using FluentValidation;
using MediatR;

namespace Agriculture.Application.Abstractions.Behaviors;

public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : class
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var errors = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .Select(f => new Error(f.PropertyName, f.ErrorMessage))
            .Distinct()
            .ToArray();

        if (errors.Length == 0)
            return await next();

        if (typeof(TResponse) == typeof(Result))
            return (TResponse)(object)Result.Failure(errors[0]);

        if (typeof(TResponse).IsGenericType &&
            typeof(TResponse).GetGenericTypeDefinition() == typeof(Result<>))
        {
            var resultType = typeof(TResponse).GetGenericArguments()[0];
            var failureMethod = typeof(Result)
                .GetMethods()
                .First(m => m is { Name: "Failure", IsGenericMethod: true })
                .MakeGenericMethod(resultType);

            return (TResponse)failureMethod.Invoke(null, [errors[0]])!;
        }

        throw new ValidationException(validationResults.SelectMany(r => r.Errors));
    }
}
