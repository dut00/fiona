# Intro
Chce przygotowac prosta aplikację, ktorą będzie potrafiła przeanalizować nagraną próbkę dźwięku (np. przez stukcnięcie w szkalnkę), z któej to (wykorzystyjąć szybką transformatę foureira) wyciągnie częstotliwość drgań własnych. Na podstawie tej czestotliwości będize mogła odtworzyć ton, wprowadzając obiekt (dajacy próbkę dźwięku) w drgania rezonansowe. W najlpeszym przypadku drgania te bedą mogły sprawić, ze przykładowa szklanka pęknie.

# Skąd nazwa?
Nazwia nawiązuje do sceny z bajki `Shrek`, w której `Fiona` śpiewa z ptakiem i w pewnej chwili unosi swój głos na wysokim tonie i ten ptak wybucha.

# Mobile first!
Aplikacja musi dobrze wygladać dobrze na smartfonach, bo to jej główne środowisko.

# Stack
- React
- Tailwind css?

# Wymagania
- dostęp do mikrofonu
- dostęp do głośnika

# Korekta tonu
Odtwarzany dźwięk z głośników może trochę się różnić od tego odebranego przez mikrofon. Przydałaby się funkcjonalność, która może dodkanać małej korekty tonu wychadzacego z głośnika. Jeżeli Oblicozny ton wyniósł np. 440Hz, a głosnik (mimo wskazania tej samej częstotliwości) generuje np. 445Hz to aplikacja mogłaby np. obniżyć częstoliwość tonu tak, żeby na wyjściu z głośnika było już 440Hz.

# Ostrzeżenie dla uzytkonika o niebezpieczeństwie
Użytkonik musi dostać informację, że rozumie niebezpieczeństwo wynikajace z używania tej apliacji.