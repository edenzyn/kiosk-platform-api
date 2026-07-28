# Kiosk Platform Agent Side Agent Rules

## Naming Conventions

- DTOs MUST always follow the format: `[Action][Module]RequestDto` and `[Action][Module]ResponseDto`.
  - Example: `LoginUserRequestDto`, `RegisterUserResponseDto`.

## Type Safety

- NEVER use `any`. Always maintain proper, strong TypeScript types. If a third-party library has complex types, use TypeScript utilities like `Parameters<T>` or `Interface["property"]`.

## Class Members

- ALWAYS prefix private methods and private variables with an underscore (`_`). For example: `private _generateAuthTokens()`.
