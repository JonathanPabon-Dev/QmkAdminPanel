import { supabase } from "../client";
import { toast } from "react-toastify";

const IMAGE_BUCKET = "question-options";
const IMAGE_KEYS = [
  "question_image_url",
  "option_1_image_url",
  "option_2_image_url",
  "option_3_image_url",
  "option_4_image_url",
];

// Extracts a storage path (relative to the bucket) from a public URL, or
// null when the URL does not belong to this bucket (defensive: never try to
// remove files that live elsewhere).
const storagePathFromPublicUrl = (publicUrl) => {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length).split("?")[0];
};

const Questions = {
  getQuestions: async () => {
    try {
      const response = await supabase
        .from("questions")
        .select()
        .order("id");
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  getQuestionById: async (questionId) => {
    try {
      const response = await supabase
        .from("questions")
        .select()
        .eq("id", questionId);
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  createQuestions: async (form) => {
    try {
      const response = await supabase.from("questions").insert({ ...form });
      if (response.status !== 201 || response.error) {
        toast.error("Error al crear el registro");
        return response;
      }
      toast.success("Registro creado correctamente");
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  updateQuestions: async (form, questionId) => {
    try {
      const response = await supabase
        .from("questions")
        .update({ ...form })
        .eq("id", questionId);
      if (response.status !== 204 || response.error) {
        toast.error("Error al actualizar el registro");
        return response;
      }
      toast.success("Registro actualizado correctamente");
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  // Best-effort cleanup of every image attached to a question (question and
  // its four options). Never throws; returns the storage response so callers
  // can decide how to surface a cleanup failure.
  removeQuestionImages: async (question) => {
    const paths = IMAGE_KEYS.map((key) =>
      storagePathFromPublicUrl(question?.[key])
    ).filter(Boolean);
    if (paths.length === 0) return { error: null };
    const response = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove(paths);
    if (response.error) {
      console.error(response.error);
    }
    return response;
  },

  // Deletes the question row and, on success, best-effort removes its images
  // from storage (an orphan file is harmless; a broken record is not).
  deleteQuestions: async (question) => {
    try {
      const response = await supabase
        .from("questions")
        .delete()
        .eq("id", question.id);
      if (response.status === 204) {
        toast.success("Registro eliminado correctamente");
        const cleanup = await Questions.removeQuestionImages(question);
        if (cleanup.error) {
          toast.warn(
            "La pregunta se eliminó, pero no se pudieron borrar sus imágenes."
          );
        }
      } else {
        toast.error("Error al eliminar el registro");
      }
      return response;
    } catch (error) {
      console.error(error);
    }
  },

  // Removes several previously uploaded images from the bucket. Best effort;
  // returns the storage response so callers can surface a cleanup failure.
  removeImages: async (publicUrls) => {
    const paths = (publicUrls || [])
      .map((url) => storagePathFromPublicUrl(url))
      .filter(Boolean);
    if (paths.length === 0) return { error: null };
    const response = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove(paths);
    if (response.error) {
      console.error(response.error);
    }
    return response;
  },

  // Removes a single previously uploaded image from the bucket (used when the
  // user replaces an image in an edit). Best effort; returns storage response.
  removeImage: async (publicUrl) => {
    return Questions.removeImages(publicUrl ? [publicUrl] : []);
  },

  // Uploads an option image to the public bucket and returns its public URL.
  // On failure it toasts and returns { error } (no throw) so the caller can
  // decide how to react; the Modal keeps the previous value in that case.
  uploadOptionImage: async (file) => {
    try {
      const path = `question-options/${Date.now()}-${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;
      const { error } = await supabase.storage
        .from("question-options")
        .upload(path, file);
      if (error) {
        toast.error("Error al subir la imagen");
        return { error };
      }
      const { data } = supabase.storage
        .from("question-options")
        .getPublicUrl(path);
      return data.publicUrl;
    } catch (error) {
      console.error(error);
      toast.error("Error al subir la imagen");
      return { error };
    }
  },
};

export default Questions;