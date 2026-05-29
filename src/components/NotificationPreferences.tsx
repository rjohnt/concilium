"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Bell, BellOff, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { getAllPersonas } from "@/lib/personas";
import { PersonaIcon } from "./PersonaIcon";
import {
  NotificationPreferences as PrefsType,
  getPrefs,
  setPrefs,
  toggleMutedType,
  toggleMutedPersona,
  setNotificationsEnabled,
  resetPrefs,
  onPrefsChange,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_DESCRIPTIONS,
} from "@/lib/notification-preferences";
import { NotificationType } from "@/lib/notifications";
import { PersonaId } from "@/lib/types";

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "feedback-submitted",
  "consensus-reached",
  "build-completed",
  "build-started",
  "persona-joined",
  "status-changed",
];

interface NotificationPreferencesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferencesPanel({
  isOpen,
  onClose,
}: NotificationPreferencesPanelProps) {
  const [prefs, setLocalPrefs] = useState<PrefsType>(getPrefs);
  const [justReset, setJustReset] = useState(false);

  // Sync with cross-tab changes
  useEffect(() => {
    const unsub = onPrefsChange((newPrefs) => {
      setLocalPrefs(newPrefs);
    });
    return unsub;
  }, []);

  // Re-read from store when opening
  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(getPrefs());
      setJustReset(false);
    }
  }, [isOpen]);

  const handleToggleEnabled = useCallback(() => {
    const updated = setNotificationsEnabled(!prefs.enabled);
    setLocalPrefs(updated);
  }, [prefs.enabled]);

  const handleToggleType = useCallback((type: NotificationType) => {
    const updated = toggleMutedType(type);
    setLocalPrefs(updated);
  }, []);

  const handleTogglePersona = useCallback((personaId: PersonaId) => {
    const updated = toggleMutedPersona(personaId);
    setLocalPrefs(updated);
  }, []);

  const handleReset = useCallback(() => {
    const updated = resetPrefs();
    setLocalPrefs(updated);
    setJustReset(true);
    setTimeout(() => setJustReset(false), 2000);
  }, []);

  if (!isOpen) return null;

  const personas = getAllPersonas();
  const mutedCount =
    Object.values(prefs.mutedTypes).filter(Boolean).length +
    Object.values(prefs.mutedPersonas).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md mx-4 mt-16 sm:mt-0 sm:mx-0 max-h-[80vh] overflow-y-auto rounded-xl bg-raised border border-border-visible shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-raised/95 backdrop-blur-sm rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <Bell size={18} className="text-gold" />
            <h2 className="text-base font-semibold text-ink-primary">
              Notification Preferences
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              disabled={justReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-muted hover:text-ink-primary hover:bg-elevated transition-colors disabled:opacity-50"
              title="Reset to defaults"
            >
              <RotateCcw size={12} className={justReset ? "animate-spin" : ""} />
              {justReset ? "Reset!" : "Reset"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-elevated transition-colors"
              aria-label="Close preferences"
            >
              <X size={16} className="text-ink-muted" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-deep/60 border border-border-subtle/60">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  prefs.enabled ? "bg-gold/20 text-gold" : "bg-elevated text-ink-ghost"
                }`}
              >
                {prefs.enabled ? <Bell size={18} /> : <BellOff size={18} />}
              </div>
              <div>
                <p className="text-sm font-medium text-ink-primary">
                  {prefs.enabled ? "Notifications On" : "Notifications Off"}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {prefs.enabled
                    ? mutedCount > 0
                      ? `${mutedCount} item${mutedCount !== 1 ? "s" : ""} muted`
                      : "All notifications enabled"
                    : "All notifications are suppressed"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs.enabled ? "bg-gold" : "bg-elevated border border-border-visible"
              }`}
              role="switch"
              aria-checked={prefs.enabled}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  prefs.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* By notification type */}
          <div>
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Volume2 size={12} />
              By Notification Type
            </h3>
            <div className="space-y-1">
              {ALL_NOTIFICATION_TYPES.map((type) => {
                const isMuted = prefs.mutedTypes[type] === true;
                const disabled = !prefs.enabled;
                return (
                  <button
                    key={type}
                    onClick={() => handleToggleType(type)}
                    disabled={disabled}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-elevated/60 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-primary">
                        {NOTIFICATION_TYPE_LABELS[type]}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5 truncate">
                        {NOTIFICATION_TYPE_DESCRIPTIONS[type]}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 ml-3 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                        isMuted
                          ? "bg-cardinal/10 text-cardinal"
                          : "bg-olive/10 text-olive"
                      }`}
                    >
                      {isMuted ? "Muted" : "Active"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* By persona */}
          <div>
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <VolumeX size={12} />
              By Persona
            </h3>
            <p className="text-xs text-ink-muted mb-3">
              Mute notifications when specific personas submit feedback
            </p>
            <div className="space-y-1">
              {personas.map((persona) => {
                const isMuted = prefs.mutedPersonas[persona.id] === true;
                const disabled = !prefs.enabled;
                return (
                  <button
                    key={persona.id}
                    onClick={() => handleTogglePersona(persona.id)}
                    disabled={disabled}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-elevated/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-2.5">
                      <PersonaIcon personaId={persona.id} size={18} />
                      <span className="text-sm text-ink-primary">{persona.label}</span>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                        isMuted
                          ? "bg-cardinal/10 text-cardinal"
                          : "bg-olive/10 text-olive"
                      }`}
                    >
                      {isMuted ? "Muted" : "Active"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
