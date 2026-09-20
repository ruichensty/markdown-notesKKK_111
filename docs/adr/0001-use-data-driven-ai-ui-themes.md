# ADR-0001: Use data-driven AI UI theme packages

## Status

Accepted

## Context

The AI assistant needs multiple built-in visual styles and user-created themes that can be imported at runtime. Notes and API keys are stored in the browser, so imported themes must not execute code, inject arbitrary CSS, load remote assets, or gain access to application state. Existing avatar images and AI behavior must remain independent from the selected UI style.

## Decision

Use versioned JSON theme packages with the format identifier `markdown-notes-ai-ui-theme`. A package contains metadata, a built-in style base, and a fixed set of validated visual tokens. Tokens are converted to scoped CSS custom properties on the assistant avatar, tip, and chat panel. Colors accept six-digit hexadecimal values only; numeric values are clamped to documented ranges. JavaScript, HTML, raw CSS, SVG, and remote URLs are not accepted.

Built-in styles remain code-owned CSS classes. Imported themes extend one built-in style and are stored with settings in IndexedDB. PNG/WebP avatar images remain a separate feature and can be combined with every UI style.

## Consequences

### Positive

- Runtime imports cannot execute scripts or read local notes.
- Theme packages are portable, versioned, testable, and easy to validate.
- Built-in and custom themes share the same rendering path.
- Future versions can migrate explicitly through the package version field.

### Negative

- Theme authors cannot arbitrarily rearrange React component structure.
- New customizable properties require schema and CSS-variable changes.
- Imported themes are intentionally less powerful than code plugins.

### Neutral

- Fully custom layouts remain a development-time feature requiring source changes and a rebuild.

## Alternatives Considered

**Import arbitrary CSS**

- Rejected because CSS can load remote resources, escape expected visual boundaries, and break the application layout.

**Import JavaScript or TSX plugins**

- Rejected because runtime code would have the same browser privileges as the application and could access notes or credentials.

**Store only a single color preset**

- Rejected because it does not satisfy user-created themes or meaningful differences between companion, pet, and minimal styles.

## References

- `src/types/aiUiTheme.ts`
- `src/utils/aiUiTheme.ts`
