import os
import hashlib
import re
from typing import Any, Dict, List, Optional
from uuid import uuid4
import base64
import io

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field
import numpy as np

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

try:
    from openpyxl import load_workbook
except ImportError:
    load_workbook = None

app = FastAPI(title='Local AI Service', version='1.0.0')

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context: Optional[str] = None
    documents: Optional[List[str]] = None

class DocumentRequest(BaseModel):
    text: Optional[str] = None
    file_content: Optional[str] = None
    file_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = 3
    tenant_id: Optional[str] = None

VECTOR_DB: List[Dict[str, Any]] = []
MIN_RELEVANCE_SCORE = 0.12
STOPWORDS = {
    'a', 'an', 'and', 'are', 'for', 'how', 'i', 'in', 'is', 'it', 'of', 'on',
    'or', 'the', 'to', 'what', 'when', 'where', 'which', 'who', 'with',
}


def parse_pdf(file_bytes: bytes) -> str:
    try:
        if not PdfReader:
            return ''
        pdf = PdfReader(io.BytesIO(file_bytes))
        text = ''
        for page in pdf.pages:
            text += page.extract_text() or ''
        return text.strip()
    except Exception:
        return ''


def parse_docx(file_bytes: bytes) -> str:
    try:
        if not DocxDocument:
            return ''
        doc = DocxDocument(io.BytesIO(file_bytes))
        text = '\n'.join(para.text for para in doc.paragraphs)
        return text.strip()
    except Exception:
        return ''


def parse_xlsx(file_bytes: bytes) -> str:
    try:
        if not load_workbook:
            return ''
        wb = load_workbook(io.BytesIO(file_bytes))
        text = ''
        for sheet in wb.sheetnames:
            ws = wb[sheet]
            for row in ws.iter_rows(values_only=True):
                text += ' '.join(str(cell or '') for cell in row) + '\n'
        return text.strip()
    except Exception:
        return ''


def parse_csv(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode('utf-8', errors='ignore').strip()
    except Exception:
        return ''


def extract_text_from_file(file_content: str, file_type: str) -> str:
    try:
        file_bytes = base64.b64decode(file_content)
        file_type_lower = (file_type or '').lower()

        if 'pdf' in file_type_lower:
            return parse_pdf(file_bytes)
        elif 'docx' in file_type_lower or 'word' in file_type_lower:
            return parse_docx(file_bytes)
        elif 'xlsx' in file_type_lower or 'xls' in file_type_lower or 'excel' in file_type_lower:
            return parse_xlsx(file_bytes)
        elif 'csv' in file_type_lower:
            return parse_csv(file_bytes)
        else:
            return file_bytes.decode('utf-8', errors='ignore').strip()
    except Exception as e:
        return ''


def tokenize(text: str) -> List[str]:
    return [
        token.lower()
        for token in ''.join(ch if ch.isalnum() or ch.isspace() else ' ' for ch in text).split()
        if token.lower() not in STOPWORDS
    ]


EMBEDDING_SIZE = 256


def build_embedding(text: str) -> np.ndarray:
    """Create a fixed-size representation shared by documents and queries."""
    vector = np.zeros(EMBEDDING_SIZE, dtype=float)
    for token in tokenize(text):
        digest = hashlib.sha256(token.encode('utf-8')).digest()
        index = int.from_bytes(digest[:4], byteorder='big') % EMBEDDING_SIZE
        vector[index] += 1.0
    return vector


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    a_norm = np.linalg.norm(a)
    b_norm = np.linalg.norm(b)
    if a_norm == 0 or b_norm == 0:
        return 0.0
    return float(np.dot(a, b) / (a_norm * b_norm))


def lexical_match_score(document: str, query: str) -> float:
    query_tokens = set(tokenize(query))
    document_tokens = set(tokenize(document))
    if not query_tokens:
        return 0.0
    return len(query_tokens & document_tokens) / len(query_tokens)


def answer_from_document(document: str, query: str) -> str:
    qa_pattern = re.compile(
        r'(?:^|\n|\s{2,})(?:q|question)\s*\d*\s*[:.)-]\s*(.*?)\s+'
        r'(?:a|answer)\s*[:.)-]\s*(.*?)(?=\s+(?:q|question)\s*\d*\s*[:.)-]|\Z)',
        re.IGNORECASE | re.DOTALL,
    )
    query_tokens = set(tokenize(query))
    matches = []
    for match in qa_pattern.finditer(document):
        question_text = match.group(1).strip()
        answer_text = match.group(2).strip()
        question_tokens = set(tokenize(question_text))
        score = len(query_tokens & question_tokens) / len(query_tokens) if query_tokens else 0.0
        matches.append((score, answer_text))

    if matches:
        best_score, best_answer = max(matches, key=lambda item: item[0])
        if best_score >= MIN_RELEVANCE_SCORE:
            return best_answer

    sentences = [part.strip() for part in re.split(r'\n+|(?<=[.!?])\s+', document) if part.strip()]
    if not sentences:
        return ''
    best_sentence = max(sentences, key=lambda sentence: lexical_match_score(sentence, query))
    return best_sentence if lexical_match_score(best_sentence, query) >= MIN_RELEVANCE_SCORE else ''


@app.get('/health')
def health():
    return {'status': 'ok', 'provider': 'local', 'vector_db_docs': len(VECTOR_DB)}


@app.post('/chat')
def chat(request: ChatRequest):
    message = request.message.strip()
    context = request.context or ''
    docs = request.documents or []

    if not message:
        return {'answer': 'I did not receive a valid message.'}

    if message.lower() in {'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'}:
        return {'answer': 'Hello! Ask me a question about your uploaded documents.'}

    if docs:
        answers = [answer_from_document(document, message) for document in docs]
        answers = [answer for answer in answers if answer]
        if answers:
            return {'answer': answers[0]}

    if context:
        answer = (
            f"I could not find a direct answer in the uploaded documents. "
            f"Please rephrase your question or ask about the document content."
        )
        return {'answer': answer}

    return {
        'answer': 'I could not find an uploaded document that answers that. Please upload a document or ask a document-related question.'
    }


@app.post('/documents')
def add_document(payload: DocumentRequest):
    text = payload.text or ''
    
    if payload.file_content and payload.file_type:
        extracted_text = extract_text_from_file(payload.file_content, payload.file_type)
        if extracted_text:
            text = extracted_text
        else:
            return {'status': 'parsing-failed', 'count': len(VECTOR_DB), 'message': f'Could not parse {payload.file_type} file'}
    
    if not text or not text.strip():
        return {'status': 'empty-document', 'count': len(VECTOR_DB), 'message': 'Document is empty after parsing'}
    
    metadata = payload.metadata or {}
    document_id = metadata.get('id') or f'doc-{uuid4().hex}'
    metadata['id'] = document_id

    VECTOR_DB.append({
        'id': document_id,
        'text': text,
        'metadata': metadata,
        'embedding': build_embedding(text).tolist(),
    })
    return {'status': 'stored', 'count': len(VECTOR_DB), 'id': document_id}


@app.post('/query')
def query_documents(payload: QueryRequest):
    query_vector = build_embedding(payload.query)
    ranked = []
    for item in VECTOR_DB:
        if payload.tenant_id:
            item_tenant_id = item.get('metadata', {}).get('tenantId')
            if item_tenant_id != payload.tenant_id:
                continue
        document_vector = build_embedding(item['text'])
        item['embedding'] = document_vector.tolist()
        vector_score = cosine_similarity(document_vector, query_vector)
        lexical_score = lexical_match_score(item['text'], payload.query)
        score = (vector_score * 0.4) + (lexical_score * 0.6)
        ranked.append({'score': score, 'text': item['text'], 'metadata': item['metadata']})
    ranked.sort(key=lambda x: x['score'], reverse=True)
    relevant = [item for item in ranked if item['score'] >= MIN_RELEVANCE_SCORE]
    return {'results': relevant[: max(1, payload.top_k)]}


@app.get('/documents')
def list_documents():
    return {'documents': [
        {
            'id': doc.get('id') or doc.get('metadata', {}).get('id'),
            'text': doc['text'],
            'metadata': doc['metadata'],
        }
        for doc in VECTOR_DB
    ]}


@app.delete('/documents')
def clear_documents(tenant_id: Optional[str] = Query(default=None)):
    if tenant_id:
        VECTOR_DB[:] = [
            doc
            for doc in VECTOR_DB
            if doc.get('metadata', {}).get('tenantId') != tenant_id
        ]
    else:
        VECTOR_DB.clear()
    return {'status': 'cleared', 'count': len(VECTOR_DB)}


@app.delete('/documents/{document_id}')
def delete_document(document_id: str):
    original_count = len(VECTOR_DB)
    VECTOR_DB[:] = [
        doc for doc in VECTOR_DB
        if doc.get('id') != document_id and doc.get('metadata', {}).get('id') != document_id
    ]
    return {
        'status': 'deleted' if len(VECTOR_DB) < original_count else 'not-found',
        'count': len(VECTOR_DB),
    }


@app.post('/documents/query')
def query_documents_direct(payload: QueryRequest):
    return query_documents(payload)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv('LOCAL_LLM_PORT', '8000')))
