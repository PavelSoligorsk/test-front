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
  if (Array.isArray(data?.collections)) return data.collections;
  return [];
}

const collectionPages = { teacher: new Map(), student: new Map() };
const collectionLists = { teacher: null, student: null };

function rememberCollections(audience, collections) {
  const map = collectionPages[audience];
  map.clear();
  collectionLists[audience] = collections || [];
  (collections || []).forEach((collection) => {
    const pages = [...(collection.pages || [])].sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
    const stamped = pages.map((page) => ({ ...page, seriesId: collection.id }));
    map.set(collection.id, stamped);
    stamped.forEach((page) => map.set(page.id, stamped));
  });
}

function pageStamp(board, seriesId) {
  return {
    id: board.id,
    title: board.title,
    pageNumber: board.pageNumber,
    objectCount: board.objects?.length ?? board.objectCount ?? 0,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    shareAccess: board.shareAccess ?? null,
    seriesId,
  };
}

export function rememberBoardPage(audience, board) {
  const key = audience === 'teacher' ? 'teacher' : 'student';
  const collections = collectionLists[key];
  const seriesId = board?.seriesId;
  if (!collections || !seriesId || !board?.id) return;
  const collection = collections.find((item) => item.id === seriesId);
  if (!collection) return;
  const pages = collection.pages || [];
  const next = pageStamp(board, seriesId);
  collection.pages = pages.some((page) => page.id === board.id)
    ? pages.map((page) => (page.id === board.id ? { ...page, ...next } : page))
    : [...pages, next];
  rememberCollections(key, collections);
}

export function forgetBoardPage(audience, pageId) {
  const key = audience === 'teacher' ? 'teacher' : 'student';
  const collections = collectionLists[key];
  if (!collections || !pageId) return;
  const next = collections
    .map((collection) => ({
      ...collection,
      pages: (collection.pages || []).filter((page) => page.id !== pageId),
    }))
    .filter((collection) => collection.pages.length);
  rememberCollections(key, next);
}

export function cachedCollectionPages(audience, board) {
  const map = collectionPages[audience === 'teacher' ? 'teacher' : 'student'];
  if (!map || !board) return null;
  return map.get(board.seriesId) || map.get(board.id) || null;
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

function loadCollections(audience, fresh) {
  if (!fresh && collectionLists[audience]) return Promise.resolve(collectionLists[audience]);
  const path = audience === 'teacher'
    ? ENDPOINTS.TEACHER_BOARD_COLLECTIONS
    : ENDPOINTS.STUDENT_BOARD_COLLECTIONS;
  return apiClient.get(path).then((response) => {
    const collections = asBoardList(response.data);
    rememberCollections(audience, collections);
    return collections;
  });
}

export function listTeacherCollections({ fresh = false } = {}) {
  return loadCollections('teacher', fresh);
}

export function listStudentCollections({ fresh = false } = {}) {
  return loadCollections('student', fresh);
}

export function createTeacherBoard(body) {
  return apiClient.post(ENDPOINTS.TEACHER_BOARDS, body).then((response) => response.data);
}

export function getTeacherBoard(id) {
  return apiClient.get(ENDPOINTS.TEACHER_BOARD(id)).then((response) => response.data);
}

export function updateTeacherBoardShare(id, body) {
  return apiClient.patch(ENDPOINTS.TEACHER_BOARD_SHARE(id), body).then((response) => response.data);
}

export function getSharedBoard(shareToken) {
  return apiClient.get(ENDPOINTS.BOARD_SHARED(shareToken)).then((response) => response.data);
}

export function deleteTeacherBoard(id) {
  return apiClient.delete(ENDPOINTS.TEACHER_BOARD(id)).then((response) => response.data);
}

export function uploadTeacherBoardImage(file) {
  const body = new FormData();
  body.append('file', file);
  return apiClient.post(ENDPOINTS.TEACHER_BOARD_IMAGES, body).then((response) => response.data);
}

// Известное: этого DELETE нет в бэкенде. Вызов оставлен как есть.
export function deleteTeacherBoardImage(fileId) {
  return apiClient.delete(`${ENDPOINTS.TEACHER_BOARD_IMAGES}/${encodeURIComponent(fileId)}`);
}

export function boardSocketUrl(audience, boardId, token, shareToken) {
  const path = audience === 'teacher'
    ? ENDPOINTS.TEACHER_BOARD_WS(boardId)
    : audience === 'shared'
      ? ENDPOINTS.BOARD_SHARED_WS(shareToken)
      : ENDPOINTS.STUDENT_BOARD_WS(boardId);
  const base = API_URL.replace(/\/+$/, '').replace(/^http/i, 'ws');
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
