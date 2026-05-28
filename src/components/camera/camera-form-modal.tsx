import type { FormEvent } from "react";
import { AlertTriangle, LoaderCircle, Save, X } from "lucide-react";
import { SelectField } from "@/components/common/select-field";
import { TextField } from "@/components/common/text-field";
import { recordingModes } from "./camera-constants";
import { ToggleField } from "./toggle-field";
import type { CameraFormMode, CameraFormState, UpdateCameraForm } from "./types";

export function CameraFormModal({
    mode,
    form,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onChange,
}: {
    mode: CameraFormMode;
    form: CameraFormState;
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onChange: UpdateCameraForm;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {mode === "create" ? "Add camera" : "Edit camera"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            Camera configuration
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                        aria-label="Close"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto px-5 py-5">
                    {errorMessage ? (
                        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{errorMessage}</span>
                        </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                            label="Name"
                            value={form.name}
                            required
                            onChange={(value) => onChange("name", value)}
                        />
                        <TextField
                            label="Hardware"
                            value={form.hardware}
                            onChange={(value) => onChange("hardware", value)}
                        />
                        <div className="md:col-span-2">
                            <TextField
                                label="RTSP"
                                value={form.rtsp}
                                required
                                onChange={(value) => onChange("rtsp", value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <ToggleField
                            label="Recording"
                            checked={form.recordingEnabled}
                            onChange={(value) => onChange("recordingEnabled", value)}
                        />
                        <ToggleField
                            label="Motion"
                            checked={form.motionEnabled}
                            onChange={(value) => onChange("motionEnabled", value)}
                        />
                        <ToggleField
                            label="Keyframe only"
                            checked={form.motionKeyframeOnly}
                            onChange={(value) => onChange("motionKeyframeOnly", value)}
                        />
                        <SelectField
                            label="Recording mode"
                            value={form.recordingMode}
                            options={recordingModes}
                            onChange={(value) =>
                                onChange(
                                    "recordingMode",
                                    value as CameraFormState["recordingMode"],
                                )
                            }
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <TextField
                            label="Sensitivity"
                            type="number"
                            value={form.motionSensitivity}
                            onChange={(value) => onChange("motionSensitivity", value)}
                        />
                        <TextField
                            label="Threshold"
                            type="number"
                            value={form.motionThreshold}
                            onChange={(value) => onChange("motionThreshold", value)}
                        />
                        <TextField
                            label="Pre seconds"
                            type="number"
                            value={form.preMotionSeconds}
                            onChange={(value) => onChange("preMotionSeconds", value)}
                        />
                        <TextField
                            label="Post seconds"
                            type="number"
                            value={form.postMotionSeconds}
                            onChange={(value) => onChange("postMotionSeconds", value)}
                        />
                        <TextField
                            label="Segment"
                            type="number"
                            value={form.segmentSeconds}
                            onChange={(value) => onChange("segmentSeconds", value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Save size={16} aria-hidden="true" />
                        )}
                        {mode === "create" ? "Create" : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
