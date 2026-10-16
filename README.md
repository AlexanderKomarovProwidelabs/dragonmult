# Дракончик

Минутный рисованный мультфильм для Тихона: застенчивый зелёный дракончик, над которым смеялись, тренируется, взрослеет, становится смелее и находит своё собственное пламя.

Карандашная графика и цветные карандаши на Canvas 2D, музыка синтезируется через Web Audio. Сделано по навыку [hand-drawn-canvas-animation](https://github.com/alesha-pro/tools/tree/main/skills/hand-drawn-canvas-animation).

## Смотреть

Откройте `dragonchik.html` в браузере, нажмите **sound: on** и **play**.

## Собрать MP4

Нужны Node 22+, Google Chrome и ffmpeg.

```bash
npm i --no-audit --no-fund
node render.mjs dragonchik.html            # out/dragonchik-final.mp4 (со звуком)
node render.mjs dragonchik.html --grid 24  # быстрый обзор кадров
```

## Файлы

- `dragonchik.html`: сценарий, раскадровка и 8 сцен
- `dragon.js`: персонажи; каждая поза перерисовывается целиком
- `bg.js`: фоны; `fx.js`: эффекты и надписи; `score.js`: музыка
- `core.js`, `studio.js`, `cels.js`, `materials.js`, `render.mjs`: движок из навыка
- `font.js`: шрифт Caveat (SIL OFL, см. `fonts/OFL.txt`)
