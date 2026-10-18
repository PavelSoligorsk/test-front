import apiClient from '../../shared/api';
import { ENDPOINTS } from '../../shared/api/endpoints';
import { API_URL } from '../../shared/config';

function detailMessage(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const text = detail.map((item) => (typeof item === 'string' ? item : item?.msg)).filter(Boolean).join('; ');
    if (text) return text;
  }
  return fallback;
}

export function boardErrorMessage(error, fallback) {
  return detailMessage(error, fallback);
}

function asBoardList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.boards)) return data.boards;
  return [];
}

export function listStudentBoards() {
  return apiClient.get(ENDPOINTS.STUDENT_BOARDS).then((response) => asBoardList(response.data));
}

export function getStudentBoard(id) {
  return apiClient.get(ENDPOINTS.STUDENT_BOARD(id)).then((response) => response.data);
}

export function uploadStudentBoardImage(file) {
  const body = new FormData();
  body.append('file', file);
  return apiClient.post(ENDPOINTS.STUDENT_BOARD_IMAGES, body).then((response) => response.data);
}

export function listTeacherBoards() {
  return apiClient.get(ENDPOINTS.TEACHER_BOARDS).then((response) => asBoardList(response.data));
}

export function createTeacherBoard(body) {
  return apiClient.post(ENDPOINTS.TEACHER_BOARDS, body).then((response) => response.data);
}

export function getTeacherBoard(id) {
  return apiClient.get(ENDPOINTS.TEACHER_BOARD(id)).then((response) => response.data);
}

export function deleteTeacherBoard(id) {
  return apiClient.delete(ENDPOINTS.TEACHER_BOARD(id)).then((response) => response.data);
}

export function uploadTeacherBoardImage(file) {
  const body = new FormData();
  body.append('file', file);
  return apiClient.post(ENDPOINTS.TEACHER_BOARD_IMAGES, body).then((response) => response.data);
}

export function listGeoGebraTemplates() {
  return apiClient.get(ENDPOINTS.BOARD_GEOGEBRA_TEMPLATES).then((response) => response.data || []);
}

export function getGeoGebraTemplate(id, lessonId) {
  return apiClient.get(ENDPOINTS.BOARD_GEOGEBRA_TEMPLATE(id), {
    params: lessonId ? { lessonId } : undefined,
  }).then((response) => response.data);
}

export function createTeacherGeoGebraTemplate({ file, id, title, appName }) {
  const body = new FormData();
  body.append('file', file);
  body.append('id', id);
  body.append('title', title);
  body.append('appName', appName);
  return apiClient.post(ENDPOINTS.TEACHER_GEOGEBRA_TEMPLATES, body).then((response) => response.data);
}

export function updateTeacherGeoGebraTemplate(id, { file, title, appName }) {
  const body = new FormData();
  if (file) body.append('file', file);
  if (title) body.append('title', title);
  if (appName) body.append('appName', appName);
  return apiClient.put(ENDPOINTS.TEACHER_GEOGEBRA_TEMPLATE(id), body).then((response) => response.data);
}

export function deleteTeacherGeoGebraTemplate(id) {
  return apiClient.delete(ENDPOINTS.TEACHER_GEOGEBRA_TEMPLATE(id)).then((response) => response.data);
}

export function boardSocketUrl(audience, boardId, token) {
  const path = audience === 'teacher' ? ENDPOINTS.TEACHER_BOARD_WS(boardId) : ENDPOINTS.STUDENT_BOARD_WS(boardId);
  const base = API_URL.replace(/\/+$/, '').replace(/^http/i, 'ws');
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
