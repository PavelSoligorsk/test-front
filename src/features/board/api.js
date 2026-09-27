import apiClient from '../../shared/api';
import { ENDPOINTS } from '../../shared/api/endpoints';
import { API_URL } from '../../shared/config';

export class BoardConflictError extends Error {
  constructor(board) {
    super('На сервере уже более новая версия доски');
    this.name = 'BoardConflictError';
    this.board = board;
  }
}

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
  if (error instanceof BoardConflictError) return error.message;
  return detailMessage(error, fallback);
}

async function putBoard(url, board) {
  try {
    const { data } = await apiClient.put(url, board);
    return data;
  } catch (error) {
    if (error.response?.status === 409 && error.response.data?.id) {
      throw new BoardConflictError(error.response.data);
    }
    throw error;
  }
}

export function listStudentBoards() {
  return apiClient.get(ENDPOINTS.STUDENT_BOARDS).then((response) => response.data || []);
}

export function createStudentBoard(title) {
  return apiClient.post(ENDPOINTS.STUDENT_BOARDS, { title }).then((response) => response.data);
}

export function getStudentBoard(id) {
  return apiClient.get(ENDPOINTS.STUDENT_BOARD(id)).then((response) => response.data);
}

export function putStudentBoard(board) {
  return putBoard(ENDPOINTS.STUDENT_BOARD(board.id), board);
}

export function deleteStudentBoard(id) {
  return apiClient.delete(ENDPOINTS.STUDENT_BOARD(id)).then((response) => response.data);
}

export function getStudentLessonBoard(lessonId) {
  return apiClient.get(ENDPOINTS.STUDENT_LESSON_BOARD(lessonId)).then((response) => response.data);
}

export function uploadStudentBoardImage(file) {
  const body = new FormData();
  body.append('file', file);
  return apiClient.post(ENDPOINTS.STUDENT_BOARD_IMAGES, body).then((response) => response.data);
}

export function getTeacherLessonBoards(lessonId) {
  return apiClient.get(ENDPOINTS.TEACHER_LESSON_BOARDS(lessonId)).then((response) => response.data);
}

export function getTeacherBoard(id) {
  return apiClient.get(ENDPOINTS.TEACHER_BOARD(id)).then((response) => response.data);
}

export function putTeacherBoard(board) {
  return putBoard(ENDPOINTS.TEACHER_BOARD(board.id), board);
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

function readToken() {
  try {
    const session = JSON.parse(localStorage.getItem('edu_session') || '{}');
    return session?.token || session?.access_token || localStorage.getItem('edu_token') || '';
  } catch {
    return localStorage.getItem('edu_token') || '';
  }
}

export function putStudentBoardKeepalive(board) {
  putBoardKeepalive(ENDPOINTS.STUDENT_BOARD(board.id), board);
}

export function putTeacherBoardKeepalive(board) {
  putBoardKeepalive(ENDPOINTS.TEACHER_BOARD(board.id), board);
}

function putBoardKeepalive(url, board) {
  const token = readToken();
  if (!token || !board?.id) return;
  fetch(`${API_URL}${url}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(board),
    keepalive: true,
  }).catch(() => {});
}
