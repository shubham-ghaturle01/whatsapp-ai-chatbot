import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getHello(@Res() res: Response): void {
    const html = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>WhatsApp AI Admin</title>
        <style>
          :root {
            --bg: #0f172a;
            --panel: #111827;
            --card: #1f2937;
            --card-2: #0b1220;
            --line: #374151;
            --text: #f3f4f6;
            --muted: #9ca3af;
            --blue: #3b82f6;
            --green: #10b981;
            --amber: #f59e0b;
            --red: #ef4444;
          }

          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: linear-gradient(180deg, #020817 0%, #111827 100%);
            color: var(--text);
            font-family: Arial, sans-serif;
            padding: 40px 20px;
          }
          .container { max-width: 1100px; margin: 0 auto; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            flex-wrap: wrap;
          }
          h1 { margin: 0; font-size: 2rem; }
          .status-pill {
            display: inline-flex;
            align-items: center;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: bold;
            letter-spacing: 0.04em;
            background: rgba(16, 185, 129, 0.14);
            color: #d1fae5;
            border: 1px solid rgba(16, 185, 129, 0.35);
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
          }
          .card {
            background: rgba(31, 41, 55, 0.92);
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 20px;
            box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18);
          }
          .label {
            color: var(--muted);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 10px;
          }
          .metric {
            font-size: 2rem;
            font-weight: bold;
            margin: 0;
          }
          .small { font-size: 0.9rem; color: var(--muted); }
          .row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 18px;
          }
          select {
            width: 220px;
            padding: 12px 14px;
            border-radius: 10px;
            border: 1px solid var(--line);
            background: var(--card-2);
            color: var(--text);
            font-size: 14px;
          }
          button {
            background: linear-gradient(135deg, var(--blue), #1d4ed8);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 12px 18px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          pre {
            background: rgba(15, 23, 42, 0.9);
            color: #e2e8f0;
            border: 1px solid var(--line);
            border-radius: 12px;
            padding: 16px;
            overflow: auto;
            font-size: 13px;
            line-height: 1.5;
          }
          .documents-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
          }
          .doc-item {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 12px;
          }
          .doc-row {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }
          .doc-text {
            color: #e5e7eb;
            line-height: 1.5;
            margin-bottom: 8px;
          }
          .doc-meta {
            color: var(--muted);
            font-size: 12px;
            word-break: break-word;
          }
          .delete-doc-btn {
            background: #7f1d1d;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 12px;
            cursor: pointer;
          }
          .view-doc-btn {
            background: #1e40af;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 12px;
            cursor: pointer;
            margin-right: 6px;
          }
          .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            align-items: center;
            justify-content: center;
          }
          .modal.active {
            display: flex;
          }
          .modal-content {
            background: var(--card);
            border: 1px solid var(--line);
            border-radius: 14px;
            padding: 24px;
            max-width: 700px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
          }
          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--line);
            padding-bottom: 12px;
          }
          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: var(--text);
          }
          .modal-close {
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
          }
          .modal-body {
            color: #e5e7eb;
            line-height: 1.6;
            word-wrap: break-word;
            white-space: pre-wrap;
            margin-bottom: 16px;
          }
          .modal-metadata {
            background: rgba(15, 23, 42, 0.9);
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 12px;
            margin-top: 16px;
          }
          .modal-metadata-label {
            color: var(--muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
          }
          .modal-metadata-value {
            color: #e5e7eb;
            font-size: 13px;
            word-break: break-all;
            margin-bottom: 8px;
          }
          .empty {
            color: var(--muted);
            padding: 8px 0;
          }
          .toolbar {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 12px;
          }
          .secondary {
            background: #374151;
          }
          .danger {
            background: #b91c1c;
          }
          .search-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 12px;
          }
          .upload-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 12px;
            align-items: center;
          }
          input {
            flex: 1;
            min-width: 200px;
            padding: 12px 14px;
            border-radius: 10px;
            border: 1px solid var(--line);
            background: var(--card-2);
            color: var(--text);
            font-size: 14px;
          }
          input[type="file"] {
            width: 100%;
            max-width: 420px;
            padding: 10px;
            background: var(--card-2);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>WhatsApp AI Admin</h1>
            <div class="status-pill" id="providerBadge">Loading...</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="label">Current provider</div>
              <p class="metric" id="providerMetric">-</p>
            </div>
            <div class="card">
              <div class="label">Document count</div>
              <p class="metric" id="documentMetric">0</p>
            </div>
            <div class="card">
              <div class="label">Vector records</div>
              <p class="metric" id="vectorMetric">0</p>
            </div>
            <div class="card">
              <div class="label">Local service</div>
              <p class="metric" id="localMetric">-</p>
            </div>
          </div>

          <div class="card">
            <div class="label">Provider switch</div>
            <div class="row">
              <select id="providerSelect">
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="local">Local LLM</option>
              </select>
              <button id="saveBtn">Save Provider</button>
            </div>
          </div>

          <div class="card">
            <div class="label">Stored documents</div>
            <div class="toolbar">
              <button id="refreshBtn" class="secondary">Refresh</button>
              <button id="clearBtn" class="danger">Clear Index</button>
            </div>
            <div id="documentsList" class="documents-list">Loading...</div>
          </div>

          <div class="card">
            <div class="label">Upload document</div>
            <div class="upload-row">
              <input id="uploadInput" type="file" accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx,.xls" />
              <button id="uploadBtn">Upload & Index</button>
            </div>
          </div>

          <div class="card">
            <div class="label">Manual document query</div>
            <div class="search-row">
              <input id="queryInput" type="text" placeholder="Search stored documents..." />
              <button id="queryBtn">Search</button>
            </div>
            <div id="queryResults" class="documents-list"></div>
          </div>

          <div class="card">
            <div class="label">System status</div>
            <pre id="statusBox">Loading...</pre>
          </div>
        </div>

        <div id="detailsModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Document Details</h2>
              <button class="modal-close" onclick="closeDetailsModal()">Close</button>
            </div>
            <div class="modal-body" id="detailsBody">Loading...</div>
            <div class="modal-metadata" id="detailsMetadata"></div>
          </div>
        </div>

        <script>
          function openDetailsModal(doc) {
            const body = document.getElementById('detailsBody');
            const metadata = document.getElementById('detailsMetadata');
            const text = doc.text || '';
            const metaObj = doc.metadata || {};

            body.textContent = text;

            let metaHtml = '';
            for (const key in metaObj) {
              const value = metaObj[key];
              metaHtml += '<div><div class="modal-metadata-label">' + key + '</div><div class="modal-metadata-value">' + JSON.stringify(value) + '</div></div>';
            }
            metadata.innerHTML = metaHtml || '<div class="empty">No metadata.</div>';

            document.getElementById('detailsModal').classList.add('active');
          }

          function closeDetailsModal() {
            document.getElementById('detailsModal').classList.remove('active');
          }

          async function loadStatus() {
            const res = await fetch('/ai/status');
            const data = await res.json();
            const provider = data.provider || 'local';
            const localHealthy = data.localServiceHealthy === true ? 'Healthy' : 'Offline';

            document.getElementById('providerBadge').textContent = 'Provider: ' + provider;
            document.getElementById('providerSelect').value = provider;
            document.getElementById('providerMetric').textContent = provider;
            document.getElementById('documentMetric').textContent = data.documentCount ?? 0;
            document.getElementById('vectorMetric').textContent = data.vectorDocumentCount ?? 0;
            document.getElementById('localMetric').textContent = localHealthy;
            document.getElementById('statusBox').textContent = JSON.stringify(data, null, 2);

            const docRes = await fetch('/ai/documents');
            const docData = await docRes.json();
            const docs = docData.documents || [];
            const list = document.getElementById('documentsList');

            if (!docs.length) {
              list.innerHTML = '<div class="empty">No documents indexed yet.</div>';
              return;
            }

            list.innerHTML = docs.map((doc) => {
              const metadata = doc.metadata ? JSON.stringify(doc.metadata) : '{}';
              const text = (doc.text || '').slice(0, 180);
              const docId = doc.id || doc.metadata?.id || '';
              const viewButton = '<button class="view-doc-btn" onclick="openDetailsModal(' + JSON.stringify(doc).replace(/'/g, '&#39;').replace(/"/g, '&quot;') + ')">View</button>';
              const deleteButton = docId ? '<button class="delete-doc-btn" data-doc-id="' + docId + '">Delete</button>' : '';
              return '<div class="doc-item"><div class="doc-row"><div class="doc-text">' + text + '</div><div>' + viewButton + deleteButton + '</div></div><div class="doc-meta">' + metadata + '</div></div>';
            }).join('');

            document.querySelectorAll('.delete-doc-btn').forEach((button) => {
              button.addEventListener('click', async (event) => {
                const docId = event.currentTarget.getAttribute('data-doc-id');
                if (!docId) {
                  return;
                }

                const res = await fetch('/ai/documents/' + encodeURIComponent(docId), {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: docId })
                });
                const data = await res.json();
                await loadStatus();
                alert(data.status === 'deleted' ? 'Document deleted.' : 'Could not delete document.');
              });
            });
          }

          async function queryDocuments() {
            const query = document.getElementById('queryInput').value.trim();
            const resultsBox = document.getElementById('queryResults');

            if (!query) {
              resultsBox.innerHTML = '<div class="empty">Enter a search term.</div>';
              return;
            }

            const res = await fetch('/ai/documents/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query })
            });
            const data = await res.json();
            const results = data.results || [];

            if (!results.length) {
              resultsBox.innerHTML = '<div class="empty">No matching documents found.</div>';
              return;
            }

            function relevantExcerpt(text, searchQuery) {
              const parts = text.split(/\\n+|(?<=[.!?])\\s+/).filter(Boolean);
              const queryTokens = new Set(searchQuery.toLowerCase().match(/[a-z0-9]+/g) || []);
              const rankedParts = parts.map((part, index) => {
                const tokens = new Set(part.toLowerCase().match(/[a-z0-9]+/g) || []);
                const matches = [...queryTokens].filter((token) => tokens.has(token)).length;
                return { part, index, matches };
              }).sort((left, right) => right.matches - left.matches);

              if (!rankedParts.length || rankedParts[0].matches === 0) {
                return text.slice(0, 280);
              }

              const bestMatch = rankedParts[0];
              const selected = [bestMatch, parts[bestMatch.index + 1]]
                .filter(Boolean)
                .map((item) => item.part ? item.part.trim() : item.trim());
              return selected.join(' ').slice(0, 420);
            }

            resultsBox.innerHTML = results.map((item) => {
              const metadata = item.metadata ? JSON.stringify(item.metadata) : '{}';
              const excerpt = relevantExcerpt(item.text || '', query);
              return '<div class="doc-item"><div class="doc-text">' + excerpt + '</div><div class="doc-meta">Score: ' + (item.score || 0).toFixed(4) + ' | ' + metadata + '</div></div>';
            }).join('');
          }

          async function uploadDocument() {
            const input = document.getElementById('uploadInput');
            const file = input.files && input.files[0];
            if (!file) {
              alert('Please choose a file first.');
              return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64Data = event.target.result.split(',')[1];
              const res = await fetch('/ai/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  file_content: base64Data,
                  file_type: file.type || file.name.split('.').pop(),
                  metadata: {
                    filename: file.name,
                    type: file.type || 'text/plain',
                    source: 'dashboard-upload'
                  }
                })
              });
              const data = await res.json();
              await loadStatus();
              if (data.status === 'stored') {
                alert('Document indexed successfully.');
              } else {
                alert('Error: ' + (data.message || 'Could not index document. ' + data.status));
              }
              input.value = '';
            };
            reader.readAsDataURL(file);
          }

          document.getElementById('saveBtn').addEventListener('click', async () => {
            const provider = document.getElementById('providerSelect').value;
            const res = await fetch('/ai/provider', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider })
            });
            const data = await res.json();
            await loadStatus();
            alert(data.message || 'Provider updated');
          });

          document.getElementById('refreshBtn').addEventListener('click', loadStatus);

          document.getElementById('clearBtn').addEventListener('click', async () => {
            const res = await fetch('/ai/documents', { method: 'DELETE' });
            const data = await res.json();
            await loadStatus();
            alert(data.status === 'cleared' ? 'Document index cleared.' : 'Could not clear index.');
          });

          document.getElementById('queryBtn').addEventListener('click', queryDocuments);
          document.getElementById('uploadBtn').addEventListener('click', uploadDocument);
          document.getElementById('queryInput').addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              queryDocuments();
            }
          });

          document.getElementById('detailsModal').addEventListener('click', (event) => {
            if (event.target === document.getElementById('detailsModal')) {
              closeDetailsModal();
            }
          });

          loadStatus();
        </script>
      </body>
      </html>
    `;

    res.send(html);
  }
}
