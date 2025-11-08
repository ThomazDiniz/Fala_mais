import whisper
import pyaudio
import numpy as np
import sys
import threading

# Configurações de áudio
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000  # Whisper funciona melhor com 16kHz

MIN_AUDIO_DURATION = 0.5  # Duração mínima de áudio para processar

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

def gravar_audio_ate_enter(indice_microfone):
    """Grava áudio até o usuário pressionar Enter"""
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
    gravando = True
    
    def gravar():
        """Thread para gravar áudio continuamente"""
        nonlocal gravando, frames
        print("Gravando", end="", flush=True)
        
        while gravando:
            try:
                data = stream.read(CHUNK, exception_on_overflow=False)
                frames.append(data)
                print(".", end="", flush=True)  # Feedback visual
            except Exception as e:
                if gravando:  # Só imprime erro se ainda está gravando
                    print(f"\nErro ao gravar: {e}")
                break
    
    # Iniciar thread de gravação
    thread_gravacao = threading.Thread(target=gravar, daemon=True)
    thread_gravacao.start()
    
    # Aguardar Enter na thread principal (bloqueia até Enter ser pressionado)
    try:
        input()  # Aguarda Enter
        gravando = False
        print("\nFinalizando gravação...")
    except (EOFError, KeyboardInterrupt):
        gravando = False
        print("\nInterrompendo gravação...")
    
    # Aguardar thread de gravação terminar
    thread_gravacao.join(timeout=1.0)
    
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

def transcrever_audio(indice_microfone, modelo_whisper):
    """Transcreve o áudio do microfone selecionado usando Whisper"""
    print("\nPronto para gravar!")
    print("Fale o que quiser e pressione ENTER quando terminar de falar.")
    print("Pressione Ctrl+C para encerrar o programa.\n")
    print("-" * 50)
    
    # Loop contínuo de transcrição
    while True:
        try:
            print("\nPressione ENTER para começar a gravar...")
            input()  # Aguarda Enter para começar
            
            print("\nGravando! Pressione ENTER novamente quando terminar de falar...")
            audio_data = gravar_audio_ate_enter(indice_microfone)
            
            if audio_data is None:
                print("Áudio muito curto ou nenhum áudio detectado. Tente novamente.\n")
                print("-" * 50)
                continue
            
            print("Processando com Whisper...")
            
            # Transcrever com Whisper
            resultado = modelo_whisper.transcribe(audio_data, language='pt')
            texto = resultado["text"].strip()
            
            if texto:
                print(f"\n{'='*50}")
                print(f"TRANSCRIÇÃO COMPLETA:")
                print(f"{'='*50}")
                print(f"{texto}\n")
                print(f"{'='*50}\n")
            else:
                print("(nenhum texto detectado)\n")
            
            print("-" * 50)
                
        except KeyboardInterrupt:
            print("\n\nPrograma encerrado pelo usuário.")
            break
        except Exception as e:
            print(f"Erro inesperado: {e}\n")
            print("-" * 50)
            import traceback
            traceback.print_exc()

def main():
    """Função principal"""
    print("=" * 50)
    print("  TRANSCRITOR DE ÁUDIO DO MICROFONE")
    print("  Usando Whisper (offline)")
    print("  Modo: Gravação Manual (ENTER)")
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

