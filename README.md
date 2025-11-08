# Fala Mais - Transcritor de Áudio

Um projeto simples para falar no microfone e transcrever o que você diz em texto.

## Versão Web

A forma mais fácil de usar. Funciona direto no navegador, sem instalação.

**[Acesse a versão web aqui](https://ThomazDiniz.github.io/Fala_mais/)**

Para usar:
1. Abra a página no navegador (Chrome ou Edge funcionam melhor)
2. Permita o acesso ao microfone quando solicitado
3. Clique em "Começar a Gravar" e comece a falar
4. A transcrição aparece automaticamente na tela

A versão web funciona offline depois de carregar a página. Use Chrome ou Edge para melhor compatibilidade.

## Versão Python

Se você tem Python instalado e quer uma transcrição com melhor qualidade, use a versão Python com Whisper.

### Instalação

```bash
pip install -r requirements.txt
```

Se tiver problemas para instalar o pyaudio no Windows, tente:
```bash
pip install pipwin
pipwin install pyaudio
```

### Uso

Existem duas versões disponíveis:

**1. Detecção automática de silêncio:**
```bash
python transcrever_audio.py
```
O programa detecta quando você para de falar e transcreve automaticamente. Basta falar normalmente e parar quando terminar.

**2. Controle manual:**
```bash
python transcrever_audio_enter.py
```
Você controla quando começar e parar a gravação pressionando ENTER. Pressione ENTER para começar, fale o que quiser, e pressione ENTER novamente para parar e ver a transcrição.

Ambas as versões permitem selecionar qual microfone usar e funcionam offline após baixar o modelo Whisper na primeira execução.

## Requisitos

- Python 3.8+ (apenas para versão Python)
- Microfone conectado
- Navegador moderno (Chrome/Edge para versão web)
- Conexão com internet apenas na primeira vez (para baixar o modelo)

## Modelos Whisper

A versão Python usa o modelo "base" por padrão, que oferece bom equilíbrio entre velocidade e qualidade. Você pode alterar no código para modelos maiores (small, medium, large) se quiser mais precisão, ou menores (tiny) se quiser mais velocidade.
