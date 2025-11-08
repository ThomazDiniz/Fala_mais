# Transcrição de Áudio do Microfone

Este projeto transcreve áudio do microfone em tempo real. Disponível em versões Python (usando Whisper) e Web (usando Web Speech API).

## 🚀 Versão Web (Recomendada para GitHub Pages)

A versão web é a mais simples de usar e não requer instalação. Basta abrir o arquivo `index.html` no navegador.

### Como Usar a Versão Web:

1. **Localmente:**
   - Abra o arquivo `index.html` no seu navegador (Chrome ou Edge recomendados)
   - Permita o acesso ao microfone quando solicitado
   - Clique em "Começar a Gravar" e comece a falar

2. **GitHub Pages:**
   - Faça push dos arquivos `index.html`, `style.css` e `script.js` para o repositório
   - Ative o GitHub Pages nas configurações do repositório
   - Acesse a página através do link fornecido pelo GitHub Pages

### Características da Versão Web:
- ✅ Funciona direto no navegador (sem servidor)
- ✅ HTML, CSS e JavaScript puro (sem frameworks)
- ✅ Seleção de microfone
- ✅ Modo contínuo ou único
- ✅ Interface moderna e responsiva
- ✅ Funciona offline (após carregar a página)

### Requisitos da Versão Web:
- Navegador: Chrome, Edge ou outros baseados em Chromium
- Acesso ao microfone (permissão do navegador)
- **Nota:** Firefox e Safari podem ter suporte limitado à Web Speech API

---

## 🐍 Versões Python

### Instalação

1. Instale as dependências:
```bash
pip install -r requirements.txt
```

**Nota para Windows:** Se houver problemas ao instalar o `pyaudio`, você pode tentar:
```bash
pip install pipwin
pipwin install pyaudio
```

Ou baixar o wheel apropriado de: https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio

## Programas Python Disponíveis

### 1. `transcrever_audio.py` - Detecção Automática de Silêncio

Gravação automática que para quando detecta silêncio.

**Uso:**
```bash
python transcrever_audio.py
```

**Funcionalidades:**
1. Carrega o modelo Whisper (na primeira vez, o modelo será baixado)
2. Lista todos os microfones disponíveis
3. Permite que você selecione um microfone
4. Calibra o ruído ambiente automaticamente
5. Grava áudio continuamente até detectar silêncio (quando você parar de falar)
6. Transcreve automaticamente o que você falou
7. Mostra a transcrição na tela e fica pronto para a próxima gravação

**Ideal para:** Gravações rápidas e automáticas, quando você quer que o programa detecte quando você termina de falar.

---

### 2. `transcrever_audio_enter.py` - Controle Manual com Enter

Gravação manual que para quando você pressiona ENTER.

**Uso:**
```bash
python transcrever_audio_enter.py
```

**Funcionalidades:**
1. Carrega o modelo Whisper (na primeira vez, o modelo será baixado)
2. Lista todos os microfones disponíveis
3. Permite que você selecione um microfone
4. Aguarda você pressionar ENTER para começar a gravar
5. Grava áudio continuamente enquanto você fala
6. Você pressiona ENTER novamente quando terminar de falar
7. Transcreve a gravação completa
8. Mostra a transcrição completa na tela

**Ideal para:** Gravações mais longas, quando você quer controle total sobre quando começar e terminar a gravação.

## Requisitos

- Python 3.8+
- Microfone conectado ao computador
- Conexão com a internet apenas na primeira execução (para baixar o modelo Whisper)

## Modelos Whisper

O script usa o modelo "base" por padrão. Você pode alterar no código para:
- `tiny`: Mais rápido, menos preciso
- `base`: Bom equilíbrio (padrão)
- `small`: Mais preciso, mais lento
- `medium`: Ainda mais preciso
- `large`: Mais preciso, mas muito mais lento

## Observações

### Programa 1 (Detecção Automática):
- O programa funciona **offline** após o download inicial do modelo
- A linguagem está configurada para português (pt)
- O programa detecta automaticamente quando você para de falar (detecção de silêncio)
- O threshold de silêncio é calibrado automaticamente baseado no ruído ambiente
- A gravação para após 1.5 segundos de silêncio
- Você pode falar por quanto tempo quiser - a gravação só para quando você parar de falar

### Programa 2 (Controle Manual):
- O programa funciona **offline** após o download inicial do modelo
- A linguagem está configurada para português (pt)
- Você tem controle total sobre quando começar e terminar a gravação
- Pressione ENTER duas vezes: uma para começar e outra para terminar
- Ideal para gravações longas ou quando você precisa de mais controle

### Geral (Versões Python):
- Pressione Ctrl+C para encerrar qualquer programa
- O Whisper oferece melhor qualidade de transcrição que APIs online
- Ambos os programas podem processar gravações de qualquer duração

---

## 📊 Comparação das Versões

| Característica | Versão Web | Versão Python (Whisper) |
|---------------|------------|-------------------------|
| Facilidade de uso | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Qualidade de transcrição | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Requer instalação | ❌ | ✅ |
| Funciona offline | ✅ (após carregar) | ✅ (totalmente) |
| Seleção de microfone | ✅ | ✅ |
| Suporte a português | ✅ | ✅ |
| Requer servidor | ❌ | ❌ (apenas para web) |

### Recomendações:
- **Use a versão Web** se você quer algo simples, rápido e que funciona no navegador
- **Use a versão Python** se você precisa da melhor qualidade de transcrição e tem Python instalado

