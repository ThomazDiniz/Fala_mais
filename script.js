// Variáveis globais
let recognition = null;
let isRecording = false;
let finalTranscriptText = ''; // Texto final já processado
let interimTranscriptText = ''; // Texto provisório atual

// Elementos DOM
const microphoneSelect = document.getElementById('microphoneSelect');
const toggleBtn = document.getElementById('toggleBtn');
const status = document.getElementById('status');
const transcription = document.getElementById('transcription');

// Verificar suporte à Web Speech API
function checkSupport() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        status.textContent = 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.';
        status.className = 'status ready';
        toggleBtn.disabled = true;
        return false;
    }
    return true;
}

// Inicializar Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.lang = 'pt-BR';
    recognition.continuous = true; // Sempre modo contínuo
    recognition.interimResults = true;
    
    recognition.onstart = () => {
        isRecording = true;
        updateStatus('Gravando... Fale agora!', 'recording');
        toggleBtn.textContent = 'Parar Gravação';
        toggleBtn.className = 'btn btn-secondary';
        // Não limpar o texto existente, apenas resetar as variáveis de controle
        finalTranscriptText = transcription.value; // Preservar texto já existente
        interimTranscriptText = '';
    };
    
    recognition.onresult = (event) => {
        let newInterimTranscript = '';
        let newFinalTranscript = '';
        
        // Processar apenas os novos resultados a partir do event.resultIndex
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                // Adicionar ao texto final
                newFinalTranscript += transcript + ' ';
            } else {
                // Texto provisório
                newInterimTranscript += transcript;
            }
        }
        
        // Se houver novo texto final, adicionar ao texto final existente
        if (newFinalTranscript) {
            finalTranscriptText += newFinalTranscript;
            interimTranscriptText = ''; // Limpar texto provisório quando finalizar
            transcription.value = finalTranscriptText;
            transcription.scrollTop = transcription.scrollHeight;
        } else if (newInterimTranscript) {
            // Atualizar apenas o texto provisório, mostrando junto com o final
            interimTranscriptText = newInterimTranscript;
            transcription.value = finalTranscriptText + interimTranscriptText;
            transcription.scrollTop = transcription.scrollHeight;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Erro no reconhecimento:', event.error);
        let errorMsg = 'Erro no reconhecimento de voz.';
        
        switch(event.error) {
            case 'no-speech':
                // No modo contínuo, isso é normal, não fazer nada
                return;
            case 'audio-capture':
                errorMsg = 'Erro ao capturar áudio. Verifique o microfone.';
                break;
            case 'not-allowed':
                errorMsg = 'Permissão de microfone negada. Permita o acesso ao microfone.';
                break;
            case 'network':
                errorMsg = 'Erro de rede. Verifique sua conexão.';
                break;
        }
        
        updateStatus(errorMsg, 'ready');
        resetToggleButton();
    };
    
    recognition.onend = () => {
        if (isRecording) {
            // Garantir que qualquer texto provisório seja preservado antes de reiniciar
            if (interimTranscriptText) {
                finalTranscriptText += interimTranscriptText + ' ';
                interimTranscriptText = '';
                transcription.value = finalTranscriptText;
            }
            
            // Reiniciar automaticamente no modo contínuo
            try {
                recognition.start();
            } catch (e) {
                console.error('Erro ao reiniciar:', e);
                updateStatus('Gravação finalizada', 'ready');
                resetToggleButton();
            }
        } else {
            // Garantir que o texto provisório seja preservado ao parar
            if (interimTranscriptText) {
                finalTranscriptText += interimTranscriptText + ' ';
                interimTranscriptText = '';
                transcription.value = finalTranscriptText;
            }
            updateStatus('Gravação finalizada', 'ready');
            resetToggleButton();
        }
    };
}

// Carregar microfones disponíveis
async function loadMicrophones(showMessage = false, forcePermission = false) {
    try {
        let stream = null;
        
        // Solicitar permissão e MANTER o stream aberto enquanto enumeramos
        // Isso é crucial para obter os nomes dos dispositivos
        try {
            console.log('Solicitando permissão de microfone...');
            stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('Permissão concedida, stream obtido');
            
            // Aguardar mais tempo para o sistema processar
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (e) {
            console.warn('Erro ao solicitar permissão:', e);
            if (e.name === 'NotAllowedError') {
                updateStatus('Permissão negada. Permita o acesso ao microfone.', 'ready');
                return;
            }
        }
        
        // Aguardar um pouco mais para garantir que o navegador processou tudo
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Enumerar dispositivos enquanto o stream está ativo
        console.log('Enumerando dispositivos (stream ativo)...');
        let devices = await navigator.mediaDevices.enumerateDevices();
        console.log(`Primeira enumeração: ${devices.length} dispositivos`);
        
        // Se não encontrou dispositivos com informações, tentar novamente
        if (devices.length === 0 || devices.every(d => !d.deviceId && !d.label)) {
            console.log('Tentando enumerar novamente após mais tempo...');
            await new Promise(resolve => setTimeout(resolve, 500));
            devices = await navigator.mediaDevices.enumerateDevices();
            console.log(`Segunda enumeração: ${devices.length} dispositivos`);
        }
        
        // Verificar se estamos em HTTPS (necessário para nomes de dispositivos)
        const isSecureContext = window.isSecureContext || location.protocol === 'https:';
        console.log('Contexto seguro (HTTPS):', isSecureContext);
        if (!isSecureContext) {
            console.warn('AVISO: Site não está em HTTPS. Nomes de dispositivos podem não estar disponíveis.');
        }
        
        // Parar o stream apenas após enumerar
        if (stream) {
            // Manter stream por mais um pouco antes de fechar
            await new Promise(resolve => setTimeout(resolve, 200));
            stream.getTracks().forEach(track => track.stop());
            console.log('Stream fechado');
        }
        
        // Filtrar apenas entradas de áudio
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log('Microfones encontrados:', audioInputs.length);
        audioInputs.forEach((device, idx) => {
            console.log(`  ${idx + 1}. ID: "${device.deviceId}", Label: "${device.label}", GroupID: "${device.groupId}"`);
        });
        
        if (audioInputs.length === 0) {
            microphoneSelect.innerHTML = '<option value="">Nenhum microfone encontrado</option>';
            if (showMessage) {
                updateStatus('Nenhum microfone encontrado. Verifique se há microfones conectados.', 'ready');
            }
            return;
        }
        
        // Limpar select
        microphoneSelect.innerHTML = '<option value="">Usar microfone padrão do sistema</option>';
        
        // Processar dispositivos encontrados
        const deviceOptions = [];
        
        // Se todos os dispositivos têm deviceId vazio, isso indica que o navegador
        // não está expondo os nomes (geralmente por questões de privacidade em HTTP)
        const allEmpty = audioInputs.every(d => !d.deviceId && !d.label);
        
        if (allEmpty && audioInputs.length === 1) {
            // Caso especial: apenas um dispositivo sem informações
            // Provavelmente é o microfone padrão do sistema
            console.log('Apenas um dispositivo encontrado sem informações - usando como padrão');
            deviceOptions.push({
                deviceId: '',
                label: 'Microfone Padrão',
                groupId: 'default',
                index: 0
            });
        } else {
            // Processar cada dispositivo
            for (let i = 0; i < audioInputs.length; i++) {
                const device = audioInputs[i];
                
                // Tentar obter informações do dispositivo
                let deviceInfo = {
                    deviceId: device.deviceId || '',
                    label: device.label || '',
                    groupId: device.groupId || device.deviceId || `group-${i}`,
                    index: i
                };
                
                // Se não temos label, tentar diferentes estratégias
                if (!deviceInfo.label) {
                    if (deviceInfo.deviceId && deviceInfo.deviceId !== '') {
                        // Tentar usar o deviceId para identificar
                        deviceInfo.label = `Microfone ${i + 1}`;
                    } else if (i === 0) {
                        deviceInfo.label = 'Microfone Padrão';
                    } else {
                        deviceInfo.label = `Microfone ${i + 1}`;
                    }
                }
                
                // Se não temos deviceId, usar string vazia (indica padrão)
                if (!deviceInfo.deviceId) {
                    deviceInfo.deviceId = '';
                }
                
                deviceOptions.push(deviceInfo);
            }
        }
        
        console.log(`Dispositivos processados: ${deviceOptions.length}`);
        deviceOptions.forEach((dev, idx) => {
            console.log(`  ${idx + 1}. "${dev.label}" (ID: "${dev.deviceId}")`);
        });
        
        // Agrupar por groupId para evitar duplicatas
        const seenGroups = new Map();
        const uniqueDevices = [];
        
        deviceOptions.forEach((device) => {
            const groupKey = device.groupId || device.deviceId;
            if (!seenGroups.has(groupKey)) {
                seenGroups.set(groupKey, device);
                uniqueDevices.push(device);
            } else {
                // Preferir dispositivo com label melhor
                const existing = seenGroups.get(groupKey);
                if ((!existing.label || existing.label === `Microfone ${existing.index + 1}`) && 
                    device.label && device.label !== `Microfone ${device.index + 1}`) {
                    const index = uniqueDevices.indexOf(existing);
                    if (index !== -1) {
                        uniqueDevices[index] = device;
                        seenGroups.set(groupKey, device);
                    }
                }
            }
        });
        
        console.log(`Dispositivos únicos após processamento: ${uniqueDevices.length}`);
        
        // Adicionar ao select
        uniqueDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId === 'default' ? '' : device.deviceId;
            option.textContent = device.label;
            option.title = `DeviceID: ${device.deviceId} | Index: ${device.index}`;
            microphoneSelect.appendChild(option);
        });
        
        if (showMessage) {
            updateStatus(`Carregados ${uniqueDevices.length} microfone(s)`, 'ready');
            setTimeout(() => {
                updateStatus('Pronto para gravar', 'ready');
            }, 2000);
        }
        
        console.log(`Total de opções no select: ${microphoneSelect.options.length}`);
        console.log('Opções finais:', Array.from(microphoneSelect.options).map(opt => `${opt.value}: ${opt.text}`));
        
        // Se encontramos apenas o microfone padrão e há suspeita de que há mais microfones
        if (uniqueDevices.length === 1 && allEmpty) {
            console.warn('AVISO: Apenas um microfone foi detectado. Isso pode ser uma limitação do navegador.');
            console.warn('Possíveis causas:');
            console.warn('1. O navegador está bloqueando informações dos dispositivos por privacidade');
            console.warn('2. O site pode não estar em HTTPS (GitHub Pages deve ser HTTPS)');
            console.warn('3. O sistema operacional pode não estar expondo os nomes dos dispositivos');
            console.warn('4. Pode haver apenas um microfone físico disponível no sistema');
            
            if (showMessage) {
                updateStatus(`AVISO: Apenas 1 microfone detectado. Se você tem mais microfones, eles podem não estar sendo expostos pelo navegador.`, 'ready');
                setTimeout(() => {
                    updateStatus('Pronto para gravar', 'ready');
                }, 4000);
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar microfones:', error);
        microphoneSelect.innerHTML = '<option value="">Erro ao carregar microfones</option>';
        if (showMessage) {
            updateStatus(`Erro ao carregar microfones: ${error.message}`, 'ready');
        }
    }
}

// Solicitar permissão de microfone (versão simplificada)
async function requestMicrophonePermission() {
    try {
        // Solicitar permissão básica
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Erro ao solicitar permissão:', error);
        let errorMsg = 'Permissão de microfone negada. Por favor, permita o acesso ao microfone.';
        
        if (error.name === 'NotAllowedError') {
            errorMsg = 'Permissão negada. Por favor, permita o acesso ao microfone nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
            errorMsg = 'Nenhum microfone encontrado. Conecte um microfone e clique em Atualizar.';
        }
        
        updateStatus(errorMsg, 'ready');
        return false;
    }
}

// Configurar microfone selecionado
let currentStream = null;

async function setMicrophone() {
    const deviceId = microphoneSelect.value;
    
    // Parar stream anterior se existir
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    if (!deviceId) {
        // Se nenhum microfone específico selecionado, usar padrão
        return;
    }
    
    try {
        // Abrir stream com o microfone selecionado
        // Isso ajuda o sistema a usar o microfone correto
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { deviceId: { exact: deviceId } } 
        });
        // Não parar o stream imediatamente - manter ativo para que o sistema use
        console.log('Microfone configurado:', deviceId);
    } catch (error) {
        console.error('Erro ao configurar microfone:', error);
        updateStatus('Erro ao configurar microfone selecionado. Usando microfone padrão.', 'ready');
    }
}

// Toggle gravação (iniciar/parar)
async function toggleRecording() {
    if (!isRecording) {
        // Iniciar gravação
        if (!recognition) {
            if (!checkSupport()) return;
            initSpeechRecognition();
        }
        
        // Preservar o texto atual na variável final
        finalTranscriptText = transcription.value;
        interimTranscriptText = '';
        
        // Verificar permissão
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) return;
        
        try {
            // Tentar configurar microfone se selecionado (pode não funcionar perfeitamente)
            // A Web Speech API geralmente usa o microfone padrão do sistema
            if (microphoneSelect.value) {
                await setMicrophone();
                // Pequeno delay para o sistema reconhecer o microfone
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            recognition.start();
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            updateStatus('Erro ao iniciar gravação. Tente novamente.', 'ready');
            resetToggleButton();
        }
    } else {
        // Parar gravação
        if (recognition) {
            recognition.stop();
            isRecording = false;
            // Garantir que o texto provisório seja preservado
            if (interimTranscriptText) {
                finalTranscriptText += interimTranscriptText + ' ';
                interimTranscriptText = '';
                transcription.value = finalTranscriptText;
            }
            updateStatus('Gravação finalizada', 'ready');
        }
        
        // Parar stream de áudio se existir
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }
}

// Atualizar status
function updateStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
}

// Resetar botão toggle
function resetToggleButton() {
    toggleBtn.textContent = 'Começar a Gravar';
    toggleBtn.className = 'btn btn-primary';
    isRecording = false;
}

// Event listener para o botão toggle
toggleBtn.addEventListener('click', toggleRecording);

// Botão para atualizar lista de microfones
const refreshMicrophonesBtn = document.getElementById('refreshMicrophones');
refreshMicrophonesBtn.addEventListener('click', async () => {
    refreshMicrophonesBtn.disabled = true;
    refreshMicrophonesBtn.textContent = 'Atualizando...';
    updateStatus('Atualizando lista de microfones...', 'ready');
    // Forçar nova solicitação de permissão ao atualizar
    await loadMicrophones(true, true);
    refreshMicrophonesBtn.disabled = false;
    refreshMicrophonesBtn.textContent = 'Atualizar';
});

microphoneSelect.addEventListener('change', async () => {
    if (microphoneSelect.value) {
        await setMicrophone();
    }
});

// Solicitar permissão ao carregar a página
window.addEventListener('load', async () => {
    if (checkSupport()) {
        updateStatus('Carregando microfones...', 'ready');
        // Carregar microfones forçando solicitação de permissão
        await loadMicrophones(false, true);
        updateStatus('Pronto para gravar', 'ready');
        initSpeechRecognition();
    }
});

