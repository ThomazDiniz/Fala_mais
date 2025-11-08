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
async function loadMicrophones(showMessage = false) {
    try {
        // Primeiro, solicitar permissão se ainda não foi concedida
        // Isso é necessário para obter os nomes reais dos dispositivos
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (e) {
            // Permissão já concedida ou negada, continuar mesmo assim
        }
        
        // Aguardar um pouco para garantir que os dispositivos sejam atualizados
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        if (audioInputs.length === 0) {
            microphoneSelect.innerHTML = '<option value="">Nenhum microfone encontrado</option>';
            if (showMessage) {
                updateStatus('Nenhum microfone encontrado. Conecte um microfone e clique em Atualizar.', 'ready');
            }
            return;
        }
        
        microphoneSelect.innerHTML = '<option value="">Usar microfone padrão</option>';
        
        // Criar um mapa para evitar duplicatas
        const seenIds = new Set();
        let index = 1;
        
        audioInputs.forEach((device) => {
            // Pular dispositivos duplicados
            if (seenIds.has(device.deviceId)) {
                return;
            }
            seenIds.add(device.deviceId);
            
            const option = document.createElement('option');
            option.value = device.deviceId;
            
            // Se o label estiver vazio ou for genérico, tentar criar um nome melhor
            if (!device.label || device.label.trim() === '' || device.label.includes('default')) {
                // Tentar identificar pelo deviceId ou usar um índice
                if (device.deviceId.includes('default') || index === 1) {
                    option.textContent = `Microfone Padrão (${device.deviceId.substring(0, 8)}...)`;
                } else {
                    option.textContent = `Microfone ${index} (${device.deviceId.substring(0, 8)}...)`;
                }
            } else {
                // Usar o label real do dispositivo
                option.textContent = device.label;
            }
            
            microphoneSelect.appendChild(option);
            index++;
        });
        
        if (showMessage) {
            updateStatus(`Carregados ${audioInputs.length} microfone(s)`, 'ready');
            setTimeout(() => {
                updateStatus('Pronto para gravar', 'ready');
            }, 2000);
        }
    } catch (error) {
        console.error('Erro ao carregar microfones:', error);
        microphoneSelect.innerHTML = '<option value="">Erro ao carregar microfones</option>';
        if (showMessage) {
            updateStatus('Erro ao carregar microfones. Verifique as permissões.', 'ready');
        }
    }
}

// Solicitar permissão de microfone
async function requestMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Parar o stream após obter permissão
        // Recarregar microfones após obter permissão para ter os nomes reais
        await loadMicrophones();
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
    await loadMicrophones(true);
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
        updateStatus('Solicitando permissão de microfone...', 'ready');
        // Solicitar permissão e carregar microfones (com nomes reais)
        await requestMicrophonePermission();
        updateStatus('Pronto para gravar', 'ready');
        initSpeechRecognition();
    }
});

