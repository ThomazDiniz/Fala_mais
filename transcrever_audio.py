import whisper
import pyaudio
import numpy as np
import sys

# Configurações de áudio
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Whisper funciona melhor com 16kHz

# Configurações de detecção de silêncio
SILENCE_DURATION = 1.5  # Segundos de silêncio antes de parar a gravação
MIN_AUDIO_DURATION = 0.5  # Duração mínima de áudio para processar
CALIBRATION_DURATION = 1.0  # Segundos para calibrar o ruído ambiente

def listar_microfones():
    """Lista todos os microfones disponíveis"""
    print("\n=== Microfones Disponíveis ===\n")
    audio = pyaudio.PyAudio()
    microfones = []
    
    for i in range(audio.get_device_count()):
        info = audio.get_device_info_by_index(i)
        if info['maxInputChannels'] > 0:
            microfones.append((i, info['name']))
            print(f"{len(microfones)-1}: {info['name']}")
    
    audio.terminate()
    return microfones

def selecionar_microfone(microfones):
    """Permite ao usuário selecionar um microfone"""
    while True:
        try:
            escolha = input(f"\nDigite o número do microfone que deseja usar (0-{len(microfones)-1}): ")
            indice = int(escolha)
            
            if 0 <= indice < len(microfones):
                return microfones[indice][0]  # Retorna o índice real do dispositivo
            else:
                print(f"Por favor, digite um número entre 0 e {len(microfones)-1}")
        except ValueError:
            print("Por favor, digite um número válido")
        except KeyboardInterrupt:
            print("\n\nPrograma interrompido pelo usuário.")
            sys.exit(0)

def calcular_energia(audio_data):
    """Calcula a energia (RMS) do sinal de áudio"""
    if len(audio_data) == 0:
        return 0.0
    
    audio_np = np.frombuffer(audio_data, dtype=np.int16)
    
    if len(audio_np) == 0:
        return 0.0
    
    # Calcular a média dos quadrados
    media_quadrados = np.mean(audio_np.astype(np.float64) ** 2)
    
    # Verificar se o valor é válido antes de calcular a raiz
    if media_quadrados < 0 or not np.isfinite(media_quadrados):
        return 0.0
    
    return np.sqrt(media_quadrados)

def calibrar_ruido_ambiente(indice_microfone):
    """Calibra o threshold de silêncio baseado no ruído ambiente"""
    audio = pyaudio.PyAudio()
    
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        input_device_index=indice_microfone,
        frames_per_buffer=CHUNK
    )
    
    print("Calibrando ruído ambiente... (não fale)")
    energias = []
    chunks_calibracao = int(CALIBRATION_DURATION * RATE / CHUNK)
    
    for _ in range(chunks_calibracao):
        data = stream.read(CHUNK, exception_on_overflow=False)
        energia = calcular_energia(data)
        energias.append(energia)
    
    stream.stop_stream()
    stream.close()
    audio.terminate()
    
    # Threshold é 3x a média do ruído ambiente (ajustável)
    ruido_medio = np.mean(energias)
    threshold = max(ruido_medio * 3, 200)  # Mínimo de 200 para evitar threshold muito baixo
    
    return threshold

def gravar_audio_ate_silencio(indice_microfone, threshold):
    """Grava áudio até detectar silêncio"""
    audio = pyaudio.PyAudio()
    
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        input_device_index=indice_microfone,
        frames_per_buffer=CHUNK
    )
    
    frames = []
    silencio_contador = 0
    chunks_silencio_necessarios = int(SILENCE_DURATION * RATE / CHUNK)
    gravando = False
    
    print("Aguardando você começar a falar...")
    
    while True:
        try:
            data = stream.read(CHUNK, exception_on_overflow=False)
            energia = calcular_energia(data)
            
            # Se detectou som acima do threshold
            if energia > threshold:
                if not gravando:
                    print("Gravando", end="", flush=True)
                gravando = True
                silencio_contador = 0
                frames.append(data)
                print(".", end="", flush=True)  # Feedback visual durante gravação
            # Se está gravando e detectou silêncio
            elif gravando:
                frames.append(data)  # Ainda adiciona alguns frames de silêncio
                silencio_contador += 1
                
                # Se silêncio por tempo suficiente, para de gravar
                if silencio_contador >= chunks_silencio_necessarios:
                    print("\nSilêncio detectado. Processando...")
                    break
            
        except Exception as e:
            print(f"\nErro ao gravar: {e}")
            break
    
    stream.stop_stream()
    stream.close()
    audio.terminate()
    
    # Converter para numpy array
    if frames:
        audio_data = b''.join(frames)
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Verificar duração mínima
        duracao = len(audio_np) / RATE
        if duracao < MIN_AUDIO_DURATION:
            return None
        
        return audio_np
    else:
        return None

def obter_nome_microfone(indice_microfone):
    """Obtém o nome do microfone pelo índice"""
    audio = pyaudio.PyAudio()
    try:
        info = audio.get_device_info_by_index(indice_microfone)
        return info['name']
    except:
        return "Desconhecido"
    finally:
        audio.terminate()

def transcrever_audio(indice_microfone, modelo_whisper):
    """Transcreve o áudio do microfone selecionado usando Whisper"""
    # Calibrar threshold de silêncio
    threshold = calibrar_ruido_ambiente(indice_microfone)
    print(f"Threshold calibrado: {threshold:.0f}\n")
    
    print("Pronto para gravar!")
    print("Fale normalmente - a gravação para automaticamente quando você parar de falar.")
    print("Pressione Ctrl+C para encerrar o programa.\n")
    print("-" * 50)
    
    # Loop contínuo de transcrição
    while True:
        try:
            audio_data = gravar_audio_ate_silencio(indice_microfone, threshold)
            
            if audio_data is None:
                print("Áudio muito curto ou nenhum áudio detectado. Tente novamente.\n")
                print("-" * 50)
                continue
            
            print("Processando com Whisper...")
            
            # Transcrever com Whisper
            resultado = modelo_whisper.transcribe(audio_data, language='pt')
            texto = resultado["text"].strip()
            
            if texto:
                print(f"Você disse: {texto}\n")
            else:
                print("(nenhum texto detectado)\n")
            
            print("-" * 50)
            print("\nPronto para a próxima gravação...")
                
        except KeyboardInterrupt:
            print("\n\nPrograma encerrado pelo usuário.")
            break
        except Exception as e:
            print(f"Erro inesperado: {e}\n")
            print("-" * 50)

def main():
    """Função principal"""
    print("=" * 50)
    print("  TRANSCRITOR DE ÁUDIO DO MICROFONE")
    print("  Usando Whisper (offline)")
    print("=" * 50)
    
    try:
        # Carregar modelo Whisper
        print("\nCarregando modelo Whisper...")
        print("(Na primeira execução, o modelo será baixado)")
        modelo = whisper.load_model("base")  # base, small, medium, large
        print("Modelo carregado com sucesso!\n")
        
        # Listar microfones disponíveis
        microfones = listar_microfones()
        
        if not microfones:
            print("Nenhum microfone encontrado!")
            return
        
        # Selecionar microfone
        indice_microfone = selecionar_microfone(microfones)
        nome_microfone = obter_nome_microfone(indice_microfone)
        print(f"\nMicrofone selecionado: {nome_microfone}")
        
        # Iniciar transcrição
        transcrever_audio(indice_microfone, modelo)
        
    except KeyboardInterrupt:
        print("\n\nPrograma interrompido pelo usuário.")
    except Exception as e:
        print(f"\nErro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

