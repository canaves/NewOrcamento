
    const brl = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    function parseBrazilianNumber(value) {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }

        const text = String(value ?? '').trim();
        if (!text) return 0;

        const clean = text.replace(/[^\d,.-]/g, '');
        if (!clean || clean === '-' || clean === ',' || clean === '.') return 0;

        const lastComma = clean.lastIndexOf(',');
        const lastDot = clean.lastIndexOf('.');
        let normalized = clean;

        if (lastComma > -1 && lastDot > -1) {
            normalized = lastComma > lastDot
                ? clean.replace(/\./g, '').replace(',', '.')
                : clean.replace(/,/g, '');
        } else if (lastComma > -1) {
            normalized = clean.replace(/\./g, '').replace(',', '.');
        } else if (lastDot > -1) {
            const parts = clean.split('.');
            const looksLikeThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3);
            normalized = looksLikeThousands ? clean.replace(/\./g, '') : clean;
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function formatBrazilianNumber(value, minimumFractionDigits = 0, maximumFractionDigits = 2) {
        if (value === null || value === undefined || String(value).trim() === '') return '';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits,
            maximumFractionDigits
        }).format(parseBrazilianNumber(value));
    }

    function formatMoneyInputValue(value) {
        return formatBrazilianNumber(value, 2, 2);
    }

    function formatDecimalInputValue(value) {
        return formatBrazilianNumber(value, 0, 2);
    }

    function formatMoneyInput(input) {
        input.value = formatMoneyInputValue(input.value);
        updateCalculations();
    }

    function formatDecimalInput(input) {
        input.value = formatDecimalInputValue(input.value);
        updateCalculations();
    }
    
    function setupPhoneMasks() {
        document.querySelectorAll('.phone-mask').forEach(input => {
            input.addEventListener('input', e => {
                let x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
                e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
            });
        });
    }

    function formatCpfCnpj(value) {
        const digits = value.replace(/\D/g, '').slice(0, 14);
        if (digits.length <= 11) {
            return digits
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }

        return digits
            .replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }

    function validateCpfCnpjStructure(input) {
        const size = input.value.replace(/\D/g, '').length;
        const valid = size === 0 || size === 11 || size === 14;
        input.setCustomValidity(valid ? '' : 'Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.');
    }

    function setupDocumentMasks() {
        document.querySelectorAll('.doc-mask').forEach(input => {
            input.addEventListener('input', e => {
                e.target.value = formatCpfCnpj(e.target.value);
                validateCpfCnpjStructure(e.target);
            });
            input.addEventListener('blur', e => validateCpfCnpjStructure(e.target));
        });
    }

    function toggleTheme() {
        document.body.classList.toggle('light-mode');
        const isDark = document.body.classList.contains('light-mode');
        document.getElementById('theme-toggle').textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    function showStatus(msg, color = '#25D366') {
        const el = document.getElementById('status-msg');
        el.textContent = msg;
        el.style.backgroundColor = color;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 3000);
    }

    let itemCount = 0;
    function addItem(desc = '', qtd = '', val = '', acr = '') {
        itemCount++;
        const container = document.getElementById('items-container');
        const div = document.createElement('div');
        div.className = 'item-row';
        div.id = `item-${itemCount}`;
        const qtdValue = formatDecimalInputValue(qtd);
        const valValue = formatMoneyInputValue(val);
        const acrValue = formatDecimalInputValue(acr);
		div.innerHTML = `
            <div><label>Descrição do Item</label><input class="item-desc" list="lista-produtos" value="${desc}" onchange="autoPreencher(this)" placeholder="Ex: Cerca Elétrica 6 fios"></div>
            <div><label>Qtd</label><input type="text" class="item-qtd" value="${qtdValue}" oninput="updateCalculations()" onblur="formatDecimalInput(this)" placeholder="0"></div>
            <div><label>Valor. Unit.</label><input type="text" class="item-val" value="${valValue}" step="0.01" oninput="updateCalculations()" onblur="formatMoneyInput(this)" placeholder="0,00"></div>
            <div><label>Acrésc. %</label><input type="text" class="item-acr" value="${acrValue}" step="0.01" oninput="updateCalculations()" onblur="formatDecimalInput(this)" placeholder="0"></div>
            <div><label>Total</label><input class="item-total" readonly value="R$ 0,00"></div>
            <button class="btn-remove" onclick="removeItem(${itemCount})" title="Remover">✕</button>
        `;
        container.appendChild(div);
        updateCalculations();
    }

    function removeItem(id) {
        document.getElementById(`item-${id}`).remove();
        updateCalculations();
    }

    function autoPreencher(input) {
        const produto = bancoProdutos.find(item => item.descricao === input.value);
        if (!produto) return;

        const row = input.closest('.item-row');
        if (!row) return;

        row.querySelector('.item-val').value = produto.valor || '';
        row.querySelector('.item-acr').value = produto.acrescimo || 0;

        if (!row.querySelector('.item-qtd').value) {
            row.querySelector('.item-qtd').value = 1;
        }

        updateCalculations();
    }

    function updateCalculations() {
        let subtotal = 0;
        let totalQuantidadeProdutos = 0;
        const itemRows = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const qtd = parseBrazilianNumber(row.querySelector('.item-qtd').value);
            const val = parseBrazilianNumber(row.querySelector('.item-val').value);
            const acr = parseBrazilianNumber(row.querySelector('.item-acr').value);
            const total = (qtd * val) * (1 + acr / 100);
            subtotal += total;
            if (qtd > 0) totalQuantidadeProdutos += qtd;
            itemRows.push({ row, qtd, total });
        });

        const mao = parseBrazilianNumber(document.getElementById('mao').value);
        const totalBase = subtotal + mao;
        const taxaMaquininhaEl = document.getElementById('taxa-maquininha');
        const taxaMaquininha = taxaMaquininhaEl ? parseBrazilianNumber(taxaMaquininhaEl.value) : 0;
        const valorTaxaMaquininha = totalBase * (taxaMaquininha / 100);
        const totalGeral = totalBase + valorTaxaMaquininha;
        const taxaPorProduto = totalQuantidadeProdutos > 0 ? valorTaxaMaquininha / totalQuantidadeProdutos : 0;
        itemRows.forEach(({ row, qtd, total }) => {
            const totalComTaxa = total + (qtd > 0 ? taxaPorProduto * qtd : 0);
            row.querySelector('.item-total').value = brl(totalComTaxa);
        });
        document.getElementById('total-geral').value = brl(totalGeral);
        return { subtotal, mao, totalBase, taxaMaquininha, valorTaxaMaquininha, taxaPorProduto, totalQuantidadeProdutos, totalGeral };
    }

    function formatWarrantyPeriod(monthsValue) {
        const months = parseInt(monthsValue, 10) || 12;
        if (months === 12) return '1 ano';
        if (months % 12 === 0) return `${months / 12} anos`;
        if (months === 1) return '1 mês';
        return `${months} meses`;
    }

	function openPDFPage() {
        const logoImg = document.querySelector('header .brand img');

        function buildAndOpen(logoDataUrl) {
            const bodyHTML = buildPDFHTML(logoDataUrl);
            const clientName = document.getElementById('cli-nome').value || 'Cliente';
            const safeClient = clientName.replace(/\s+/g, '_');

            const head = [
                '<!DOCTYPE html>',
                '<html lang="pt-br">',
                '<head>',
                '<meta charset="UTF-8">',
                '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                '<title>Orcamento Prevent Master<\/title>',
                '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>',
                '<style>',
                '* { box-sizing: border-box; margin: 0; padding: 0; }',
                'body { font-family: Arial, sans-serif; background: #e2e8f0; padding: 30px 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
                '.toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1e293b; padding: 12px 20px; display: flex; gap: 10px; align-items: center; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }',
                '.toolbar button { padding: 9px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }',
                '.btn-primary { background: #2d4a6b; color: white; }',
                '.btn-secondary { background: #475569; color: white; }',
                '.btn-back { background: #64748b; color: white; }',
                '.toolbar-tip { color: #94a3b8; font-size: 0.78rem; margin-left: 8px; }',
                '#pdf-content { background: white; color: #1e293b; width: 210mm; min-height: 297mm; margin: 72px auto 30px; padding: 15mm; box-shadow: 0 10px 40px rgba(0,0,0,0.25); font-size: 10pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
                '.pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }',
                '.pdf-table th, .pdf-table td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; word-wrap: break-word; }',
                '.pdf-table th { background: #f1f5f9; color: #475569; font-size: 9pt; text-transform: uppercase; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
                '.pdf-header-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 25px; border-bottom: 3px solid #2d4a6b; padding-bottom: 20px; align-items: center; }',
                '.pdf-logo img { max-height: 170px; width: auto; display: block; }',
                '.pdf-company-details { text-align: right; font-size: 9pt; color: #475569; }',
                '.pdf-company-details h2 { color: #1e293b; font-size: 16pt; margin-bottom: 5px; }',
                '.pdf-section-header { background: #f8fafc; padding: 6px 10px; font-weight: bold; border-left: 4px solid #4a7fa5; margin-bottom: 10px; color: #334155; font-size: 10pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
                '.text-right { text-align: right !important; }',
                '.text-center { text-align: center !important; }',
                '.bold { font-weight: bold; }',
                '.payment-box { margin-top: 25px; border: 2px solid #2d4a6b; border-radius: 8px; padding: 15px; background: #f0f5f9; page-break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
                '.payment-box h3 { color: #2d4a6b; font-size: 11pt; margin-bottom: 10px; border-bottom: 1px solid #c8dcea; padding-bottom: 5px; }',
                '.payment-option { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10.5pt; }',
                '@media print {',
				'  @page { size: A4; margin: 10mm; }', // Define margem para todas as páginas
				'  html, body { background: white !important; padding: 0 !important; margin: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }',
				'  .toolbar { display: none !important; }',
				'  #pdf-content { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; min-height: 0 !important; }', // Removemos o padding fixo
                '}',
                '<\/style>',
                '<\/head>',
                '<body>'
            ].join('\n');

            const toolbar = [
                '<div class="toolbar">',
                '  <button class="btn-primary" onclick="window.print()">Gerar / Salvar PDF<\/button>',
                '  <button class="btn-back" onclick="window.close()">&#8592; Fechar<\/button>',
                '  <span class="toolbar-tip">Ao salvar, desmarque "Cabe&ccedil;alhos e rodap&eacute;s" para um PDF limpo<\/span>',
                '<\/div>'
            ].join('\n');

            const scriptBlock = [
                '<script>',
                '  html2pdf().set(opt).from(el).save();',
                '}',
                '<\/script>',
                '<\/body>',
                '<\/html>'
            ].join('\n');

            const fullHTML = head + '\n' + toolbar + '\n<div id="pdf-content">\n' + bodyHTML + '\n<\/div>\n' + scriptBlock;

            const blob = new Blob([fullHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            showStatus('Abrindo visualizador de PDF...');
            setTimeout(function() { URL.revokeObjectURL(url); }, 300000);
        }

        var uploadedLogo = window._logoBase64 || null;
        if (uploadedLogo) {
            buildAndOpen(uploadedLogo);
        } else if (logoImg && logoImg.src && logoImg.src.startsWith('data:')) {
            buildAndOpen(logoImg.src);
        } else if (logoImg && logoImg.src && !logoImg.src.startsWith('data:')) {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                try { buildAndOpen(canvas.toDataURL('image/png')); }
                catch(e) { buildAndOpen(''); }
            };
            img.onerror = function() { buildAndOpen(''); };
            img.src = logoImg.src;
        } else {
            buildAndOpen('');
        }
    }

    function handleLogoUpload(event) {
        var file = event.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            window._logoBase64 = e.target.result;
            var preview = document.getElementById('logo-preview');
            preview.src = e.target.result;
            preview.style.display = 'inline-block';
            var placeholder = document.getElementById('logo-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            var headerLogo = document.querySelector('header .brand img');
            if (headerLogo) headerLogo.src = e.target.result;
            document.getElementById('logo-status').textContent = 'Logotipo carregado: ' + file.name;
            generatePreview();
        };
        reader.readAsDataURL(file);
    }

    function buildPDFHTML(logoDataUrl) {
        const data = updateCalculations();
        const emp = {
            nome: document.getElementById('emp-nome').value,
            cnpj: document.getElementById('emp-cnpj').value,
            fone: document.getElementById('emp-fone').value,
            cid: document.getElementById('emp-cid').value,
            email: document.getElementById('emp-email').value,
            site: document.getElementById('emp-site').value
        };
        const cli = {
            nome: document.getElementById('cli-nome').value,
			doc: document.getElementById('cli-doc').value,
            fone: document.getElementById('cli-fone').value,
            end: document.getElementById('cli-end').value,
            cid: document.getElementById('cli-cid').value
        };

        const validade = document.getElementById('validade').value;
        const garantiaMeses = document.getElementById('garantia-meses').value;
        const garantiaTexto = formatWarrantyPeriod(garantiaMeses);
        const descVista = parseBrazilianNumber(document.getElementById('desc-vista').value);
        const descVistaTexto = formatDecimalInputValue(descVista);
        const condPag = document.getElementById('cond-pag').value;
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        const totalAVista = data.totalGeral * (1 - descVista / 100);

		let rowsHtml = '';
		let contador = 1; // Criamos um contador começando em 1
		
		document.querySelectorAll('.item-row').forEach(row => {
			const desc = row.querySelector('.item-desc').value || 'Item sem descrição';
			const qtdValor = parseBrazilianNumber(row.querySelector('.item-qtd').value);
			const qtd = formatDecimalInputValue(qtdValor) || '0';
			const totalComTaxa = parseBrazilianNumber(row.querySelector('.item-total').value);
			
			if (qtdValor > 0) {
				// Adicionamos a coluna do contador e mudamos o colspan do desc de 3 para 2
				rowsHtml += `<tr><td class="text-center">${contador}</td><td colspan="2">${desc}</td><td class="text-center">${qtd}</td><td class="text-right bold">${brl(totalComTaxa)}</td></tr>`;
				
				contador++; // Aumenta o número para a próxima linha (1, 2, 3...)
			}
		});

        return `
            <div class="pdf-header-grid">
                <div class="pdf-logo">
                    <img src="${logoDataUrl || ''}" alt="Logo" style="max-height:170px;width:auto;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%2260%22%3E%3Crect fill=%22%232d4a6b%22 width=%22200%22 height=%2260%22/%3E%3Ctext x=%22100%22 y=%2240%22 font-size=%2218%22 fill=%22white%22 text-anchor=%22middle%22 font-weight=%22bold%22%3EPrevent Master%3C/text%3E%3C/svg%3E'">
                </div>
                <div class="pdf-company-details">
                    <h2>${emp.nome}</h2>
                    <p><b>CNPJ:</b> ${emp.cnpj || '—'}</p>
                    <p>${emp.cid || '—'}</p>
                    <p><b>Tel:</b> ${emp.fone || '—'}</p>
                    <p>${emp.email || '—'}</p>
                    <p>${emp.site || '—'}</p>
                </div>
            </div>

            <div class="pdf-section-header">DADOS DO CLIENTE</div>
            <table class="pdf-table pdf-no-break">
                <tr>
                    <td width="60%"><b>Cliente:</b> ${cli.nome || '—'}</td>
					<td width="40%"><b>CPF/CNPJ:</b> ${cli.doc || '—'}</td>
                    <td width="40%"><b>Telefone:</b> ${cli.fone || '—'}</td>
                </tr>
                <tr>
                    <td colspan="2"><b>Endereço:</b> ${cli.end || '—'}</td>
                    <td><b>Cidade:</b> ${cli.cid || '—'}</td>
                </tr>
            </table>

			<div class="pdf-section-header">ITENS E SERVIÇOS</div>
			<table class="pdf-table">
				<thead>
					<tr>
						<th width="10%" class="text-center">#</th> <th colspan="2">Descrição</th> <th width="15%" class="text-center">Qtd</th>
						<th width="25%" class="text-right">Total</th>
					</tr>
				</thead>
				<tbody>
                    ${rowsHtml}
                    ${data.mao > 0 ? `<tr><td colspan="4" class="text-right"><b>Mão de Obra Especializada</b></td><td class="text-right bold">${brl(data.mao)}</td></tr>` : ''}
                    
                    <tr style="background: #f0f5f9;">
                        <td colspan="4" class="text-right" style="font-size: 11pt; border: 1px solid #cbd5e1;"><b>VALOR TOTAL:</b></td>
                        <td class="text-right bold" style="font-size: 12pt; color: #2d4a6b; background: #f0f5f9; border: 1px solid #cbd5e1;">${brl(data.totalGeral)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="payment-box pdf-no-break">
                <h3>CONDIÇÕES DE PAGAMENTO</h3>
                <div class="payment-option">
                    <span><b>À Vista:</b> Desconto de ${descVistaTexto}% no PIX ou Dinheiro.</span>
                    <span class="bold" style="color: #10b981;">${brl(totalAVista)}</span>
                </div>
                <div class="payment-option">
                    <span><b>Outras Condições:</b> ${condPag}</span>
                    <span class="bold">${brl(data.totalGeral)}</span>
                </div>
            </div>

            <div class="payment-box pdf-no-break">
                <h3>GARANTIA</h3>
                <div class="payment-option">
                    <span><b>Equipamentos:</b> ${garantiaTexto} de garantia contra defeitos de fabricação.</span>
                </div>
                <div style="margin-top: 10px; font-size: 10pt; color: #334155; border-top: 1px solid #c8dcea; padding-top: 8px; font-weight: 600;">
                    Validade da Proposta: Condições e valores garantidos por ${validade} dias (Data de emissão: ${dataHoje}).
                </div>
            </div>

            <div style="margin-top: 40px; text-align: center; font-size: 9pt; color: #94a3b8; page-break-inside: avoid;">
                <p>Prevent Master - Construindo confiança através da inovação em segurança</p>
                <p>Agradecemos a preferência!</p>
            </div>
        `;
    }

    async function generatePreview() {
        const html = buildPDFHTML();
        document.getElementById('pdf-content').innerHTML = html;
        showStatus('Orçamento atualizado.');
    }

    async function downloadPDF() {
        const html = buildPDFHTML();
        const hiddenContainer = document.getElementById('pdf-hidden-container');
        hiddenContainer.innerHTML = html;

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Orcamento_PreventMaster_${document.getElementById('cli-nome').value || 'Cliente'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        showStatus('Gerando PDF...', '#2d4a6b');
        html2pdf().set(opt).from(hiddenContainer).save().then(() => {
            showStatus('PDF Baixado!');
            hiddenContainer.innerHTML = ''; 
        }).catch(err => {
            console.error(err);
            showStatus('Erro ao gerar PDF', '#ff4d4d');
        });
    }

    function sendWhatsApp() {
        const data = updateCalculations();
        const cliNome = document.getElementById('cli-nome').value;
        const cliFone = document.getElementById('cli-fone').value.replace(/\D/g, '');
        const descVista = parseBrazilianNumber(document.getElementById('desc-vista').value);
        const descVistaTexto = formatDecimalInputValue(descVista);
        
        if (!cliFone) {
            showStatus('Informe o telefone do cliente!', '#ff4d4d');
            return;
        }

        const msg = `Olá ${cliNome || 'Cliente'}, segue o orçamento da *Prevent Master*:\n\n` +
                    `*Total:* ${brl(data.totalGeral)}\n` +
                    `*À Vista (${descVistaTexto}% OFF):* ${brl(data.totalGeral * (1 - descVista/100))}\n\n` +
                    `Estou enviando o PDF detalhado em seguida.`;
        
        window.open(`https://api.whatsapp.com/send?phone=55${cliFone}&text=${encodeURIComponent(msg)}`, '_blank');
    }

    function getJSONFilename() {
        const nomeCompleto = (document.getElementById('cli-nome').value || '').trim();
        const fone = (document.getElementById('cli-fone').value || '').replace(/\D/g, '');
        const partes = nomeCompleto.split(/\s+/).filter(Boolean);
        const primeiro = partes[0] || 'Cliente';
        const ultimo = partes.length > 1 ? partes[partes.length - 1] : primeiro;
        const telefone = fone || '00000000000';
        return `${primeiro}_${ultimo}_${telefone}`;
    }

    function updateFilenamePreview() {
        const el = document.getElementById('json-filename-preview');
        if (el) el.textContent = getJSONFilename() + '.json';
    }

    function exportJSON() {
        const data = updateCalculations();

        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            items.push({
                descricao: row.querySelector('.item-desc').value,
                qtd: parseBrazilianNumber(row.querySelector('.item-qtd').value),
                valorUnit: parseBrazilianNumber(row.querySelector('.item-val').value),
                acrescimo: parseBrazilianNumber(row.querySelector('.item-acr').value),
            });
        });

        const payload = {
            empresa: {
                nome: document.getElementById('emp-nome').value,
                cnpj: document.getElementById('emp-cnpj').value,
                fone: document.getElementById('emp-fone').value,
                cidadeUF: document.getElementById('emp-cid').value,
                email: document.getElementById('emp-email').value,
                site: document.getElementById('emp-site').value,
            },
            cliente: {
                nome: document.getElementById('cli-nome').value,
                documento: document.getElementById('cli-doc').value,
                fone: document.getElementById('cli-fone').value,
                endereco: document.getElementById('cli-end').value,
                cidade: document.getElementById('cli-cid').value,
            },
            orcamento: {
                itens: items,
                maoDeObra: parseBrazilianNumber(document.getElementById('mao').value),
                validade: document.getElementById('validade').value,
                garantiaMeses: document.getElementById('garantia-meses').value,
                descontoVista: parseBrazilianNumber(document.getElementById('desc-vista').value),
                taxaMaquininha: parseBrazilianNumber(document.getElementById('taxa-maquininha').value),
                condicoesPagamento: document.getElementById('cond-pag').value,
                totalGeral: data.totalGeral,
            },
            exportadoEm: new Date().toISOString(),
        };

        const filename = getJSONFilename() + '.json';
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showStatus(`Orçamento baixado: ${filename}`);
    }

    function importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const payload = JSON.parse(e.target.result);

                if (payload.empresa) {
                    document.getElementById('emp-nome').value = payload.empresa.nome || '';
                    document.getElementById('emp-cnpj').value = payload.empresa.cnpj || '';
                    document.getElementById('emp-fone').value = payload.empresa.fone || '';
                    document.getElementById('emp-cid').value = payload.empresa.cidadeUF || '';
                    document.getElementById('emp-email').value = payload.empresa.email || '';
                    document.getElementById('emp-site').value = payload.empresa.site || '';
                }

                if (payload.cliente) {
                    document.getElementById('cli-nome').value = payload.cliente.nome || '';
                    document.getElementById('cli-doc').value = formatCpfCnpj(payload.cliente.documento || '');
                    document.getElementById('cli-fone').value = payload.cliente.fone || '';
                    document.getElementById('cli-end').value = payload.cliente.endereco || '';
                    document.getElementById('cli-cid').value = payload.cliente.cidade || '';
                }

                if (payload.orcamento) {
                    const orc = payload.orcamento;
                    document.getElementById('items-container').innerHTML = '';
                    itemCount = 0;
                    if (Array.isArray(orc.itens)) {
                        orc.itens.forEach(it => addItem(it.descricao, it.qtd, it.valorUnit, it.acrescimo));
                    }
                    document.getElementById('mao').value = formatMoneyInputValue(orc.maoDeObra || 0);
                    document.getElementById('validade').value = orc.validade || 7;
                    document.getElementById('garantia-meses').value = orc.garantiaMeses || 12;
                    document.getElementById('desc-vista').value = formatDecimalInputValue(orc.descontoVista || 0);
                    document.getElementById('taxa-maquininha').value = formatDecimalInputValue(orc.taxaMaquininha || 0);
                    document.getElementById('cond-pag').value = orc.condicoesPagamento || '';
                }

                updateCalculations();
                updateFilenamePreview();
                setupPhoneMasks();
                setupDocumentMasks();
                document.getElementById('import-status').textContent = `Arquivo carregado: ${file.name}`;
                showStatus('Orçamento carregado com sucesso!');
                generatePreview();
            } catch (err) {
                document.getElementById('import-status').textContent = 'Arquivo JSON inválido.';
                showStatus('Erro ao carregar orçamento', '#ff4d4d');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    }
		// Variável para guardar os produtos carregados da planilha
		let bancoProdutos = [];
		
		// Função para baixar os produtos do Google Sheets (Versão Melhorada)
		async function carregarProdutos() {
			// Usando o allorigins como ponte para evitar o bloqueio de CORS
// Usando o corsproxy.io como ponte (mais estável)
				const urlGoogle = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRl0BSck7md3oMtEG4Fs9EfPz11Cwwp63GWERyEFe02BsnEmjJucDDIQkIC3a2fniSsyy28ymrbebjE/pub?gid=0&single=true&output=csv';
                const cacheBuster = `&_=${Date.now()}`;
				const urlCSV = 'https://corsproxy.io/?' + encodeURIComponent(urlGoogle + cacheBuster);
			
			try {
				console.log("Tentando carregar os produtos...");
				const response = await fetch(urlCSV, { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error(`Falha ao carregar planilha: ${response.status}`);
                }
				const data = await response.text();
				
				// Pula a primeira linha (cabeçalho) e separa as linhas independentemente do sistema
				const linhas = data.split(/\r?\n/).slice(1);
				const datalist = document.getElementById('lista-produtos');
				
				if (!datalist) {
					console.error("ERRO: A tag <datalist id='lista-produtos'> não foi encontrada no HTML!");
					return;
				}
		
                bancoProdutos = [];
                datalist.innerHTML = '';

				let produtosCarregados = 0;
		
				linhas.forEach(linha => {
					if (!linha.trim()) return; // Pula linhas em branco
					
					// Tenta dividir por ponto e vírgula (padrão no Brasil). Se não achar, usa vírgula.
					let colunas = linha.split(';');
					if (colunas.length < 3) {
						colunas = linha.split(','); 
					}
					
					if(colunas.length >= 3) {
						const produto = {
							// O .replace(/"/g, '') limpa aspas indesejadas que o Sheets pode colocar
							codigo: colunas[0].replace(/"/g, '').trim(),
							descricao: colunas[1].replace(/"/g, '').trim(),
							valor: formatMoneyInputValue(colunas[2].replace(/"/g, '').trim()),
							acrescimo: formatDecimalInputValue((colunas[3] || '0').replace(/"/g, '').trim())
						};
						bancoProdutos.push(produto);
						
						// Cria a opção clicável no HTML
						const option = document.createElement('option');
						option.value = produto.descricao;
						datalist.appendChild(option);
						produtosCarregados++;
					}
				});
				
				console.log(`Sucesso! ${produtosCarregados} produtos foram carregados na lista.`);
			} catch (erro) {
				console.error("Erro crítico ao carregar a planilha:", erro);
			}
		}

    window.onload = () => {
		carregarProdutos(); // <-- ADICIONE ESTA LINHA AQUI
        setupPhoneMasks();
        setupDocumentMasks();

        document.getElementById('cli-nome').addEventListener('input', updateFilenamePreview);
        document.getElementById('cli-fone').addEventListener('input', updateFilenamePreview);
        updateFilenamePreview();

        addItem('Cerca Elétrica', 1, 100, 20);
        addItem('Concertina', 1, 200, 10);
        addItem('Câmeras CFTV', 1, 300, 20);



        
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('light-mode');
            document.getElementById('theme-toggle').textContent = 'Modo Claro';
        }
        generatePreview();
    };
