// lib/provider-adapter.js

export function buildProviderAdapter({
  input,
  birth_context,
  current_context
}) {
  return {
    adapter_engine: "FUTURE_PROVIDER_ADAPTER_V1",
    adapter_state: "READY",

    normalized_subject: {
      name: input?.name || "UNKNOWN",
      dob: input?.dob || null,
      tob: input?.tob || null,
      pob: input?.pob || null,
      latitude:
        input?.latitude != null ? Number(input.latitude) : birth_context?.latitude ?? null,
      longitude:
        input?.longitude != null ? Number(input.longitude) : birth_context?.longitude ?? null,
      timezone_offset:
        input?.timezone_offset ||
        birth_context?.timezone_offset ||
        current_context?.timezone_offset ||
        "+06:00"
    },

    birth_context: {
      birth_datetime_iso: birth_context?.birth_datetime_iso || null,
      birthplace: birth_context?.birthplace || input?.pob || null,
      latitude:
        birth_context?.latitude != null ? Number(birth_context.latitude) : null,
      longitude:
        birth_context?.longitude != null ? Number(birth_context.longitude) : null,
      timezone_offset:
        birth_context?.timezone_offset ||
        input?.timezone_offset ||
        "+06:00"
    },

    current_context: {
      event_datetime_iso: current_context?.event_datetime_iso || null,
      latitude:
        current_context?.latitude != null ? Number(current_context.latitude) : null,
      longitude:
        current_context?.longitude != null ? Number(current_context.longitude) : null,
      timezone_offset:
        current_context?.timezone_offset ||
        input?.timezone_offset ||
        "+06:00"
    },

    provider_flags: {
      deterministic_mode: true,
      normalized_numeric_coords: true,
      future_scan_enabled: true,
      micro_timing_enabled: true
    },

    timestamp: new Date().toISOString()
  };
}