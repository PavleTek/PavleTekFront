import api from "./api";
import type { VectorizeOptions, VectorizeResult } from "../types";

export const vectorizeService = {
  async vectorize(file: File, options?: VectorizeOptions): Promise<VectorizeResult> {
    const formData = new FormData();
    formData.append("image", file);

    if (options?.colorPrecision !== undefined) {
      formData.append("colorPrecision", String(options.colorPrecision));
    }
    if (options?.filterSpeckle !== undefined) {
      formData.append("filterSpeckle", String(options.filterSpeckle));
    }
    if (options?.cornerThreshold !== undefined) {
      formData.append("cornerThreshold", String(options.cornerThreshold));
    }
    if (options?.paletteColors !== undefined) {
      formData.append("paletteColors", String(options.paletteColors));
    }

    const response = await api.post("/tools/vectorize", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data.data as VectorizeResult;
  },
};
