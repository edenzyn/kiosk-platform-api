# Kiosk Platform Backend API Agent Rules

This project follows strict conventions for DTOs, service layer contracts, and repository layer contracts to ensure consistency and modularity.

## Naming Conventions
- DTOs MUST always follow the format: `[Action][Module]RequestDto` and `[Action][Module]ResponseDto`.
  - Example: `LoginUserRequestDto`, `RegisterUserResponseDto`.

## Type Safety
- NEVER use `any`. Always maintain proper, strong TypeScript types. If a third-party library has complex types, use TypeScript utilities like `Parameters<T>` or `Interface["property"]`.

## Class Members
- ALWAYS prefix private methods and private variables with an underscore (`_`). For example: `private _generateAuthTokens()`.

---

## 1. DTO (Data Transfer Object) Conventions
- **One DTO File Per Operation**: Do not create separate request and response DTO files (e.g. `LoginUserRequestDto.ts` and `LoginUserResponseDto.ts`).
- **File Naming**: Named `[operation-name].dtos.ts` (plural). For example: `login-user.dtos.ts`.
- **Contents**: A single DTO file must contain all request, query, body, and response DTO interfaces associated with that operation.

---

## 2. Service Layer Contracts
- **Location**: Store all service-layer method inputs and results inside `[module-name].types.ts` in the respective module's folder (e.g., `api/src/modules/auth/auth.types.ts`).
- **Naming**:
  - Input type: `<OperationName>ServiceInput`
  - Result type: `<OperationName>ServiceResult`
- **Exclusion**: External client-facing JSON responses should be typed as DTOs, but core business/service layer parameters and outputs must be specified in the types file.
- **Return Value Rule**: Service methods should not return `void` or `Promise<void>`. Use `boolean` or `Promise<boolean>` instead (returning `true` on success, `false` on failure).
- **Separation**: In the types file, separate Service types using the following header:
  ```typescript
  // ========================================
  // ? SERVICE INPUTS & RESULTS
  // ========================================
  ```

---

## 3. Repository Layer Contracts
- **Location**: Store all repository-layer method inputs and results inside `[module-name].types.ts` in the respective module's folder (e.g., `api/src/modules/auth/auth.types.ts`) rather than in the repository file itself.
- **Input and Output Objects**: Always define operation-specific input and result types for every repository operation, even when there is only a single parameter (or no parameters), to maintain consistent contracts.
- **Naming**:
  - Input type: `<OperationName>RepoInput`
  - Result type: `<OperationName>RepoResult`
- **Separation**: In the types file, separate Repository types using the following header:
  ```typescript
  // ========================================
  // ? REPOSITORY INPUTS & RESULTS
  // ========================================
  ```
- **Example**:
  ```typescript
  // inside api/src/modules/user/user.types.ts:
  // ========================================
  // ? REPOSITORY INPUTS & RESULTS
  // ========================================
  export interface FindUserByIdRepoInput {
    id: string;
  }
  export type FindUserByIdRepoResult = UserEntity | undefined;
  ```
