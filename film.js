import requests
import random
import discord
from discord.ext import commands

TOKEN = 'DISCORD_BOT_TOKENUNUZ'
API_KEY = "TMDB_API_ANAHTARINIZ"
BASE_URL = 'https://api.themoviedb.org/3'

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

def rasgele_film_al():
    for _ in range(3):
        rasgele_sayfa = random.randint(1, 500)
        sayfa_url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=tr-TR&sort_by=popularity.desc&include_adult=true&include_video=false&page={rasgele_sayfa}"
        sayfa_cevap = requests.get(sayfa_url, timeout=10)
        sayfa_cevap.raise_for_status()
        sayfa_veri = sayfa_cevap.json()
        filmler = sayfa_veri.get('results', [])

        if filmler:
            film = random.choice(filmler)
            film_id = film['id']

            detaylar_url = f"{BASE_URL}/movie/{film_id}?api_key={API_KEY}&language=tr-TR"
            krediler_url = f"{BASE_URL}/movie/{film_id}/credits?api_key={API_KEY}"
            
            detaylar_cevap = requests.get(detaylar_url)
            krediler_cevap = requests.get(krediler_url)
            detaylar_cevap.raise_for_status()
            krediler_cevap.raise_for_status()

            film_detaylari = detaylar_cevap.json()
            film_kredileri = krediler_cevap.json()

            if film_detaylari and film_kredileri:
                konu = film_detaylari.get('overview')
                if not konu:
                    continue

                yayin_yili = film_detaylari.get('release_date', '').split('-')[0] or 'N/A'
                imdb_id = film_detaylari.get('imdb_id', 'N/A')
                turler = ', '.join(tur['name'] for tur in film_detaylari.get('genres', []))
                oyuncular = ', '.join(oyuncu['name'] for oyuncu in film_kredileri.get('cast', [])[:5])
                oylama_ortalamasi = round(film_detaylari.get('vote_average', 0), 1)
                afis_url = f"https://image.tmdb.org/t/p/original{film_detaylari.get('poster_path', '')}"

                return {
                    'baslik': film_detaylari['title'],
                    'konu': konu,
                    'oylama_ortalamasi': oylama_ortalamasi,
                    'yayin_yili': yayin_yili,
                    'imdb_id': imdb_id,
                    'turler': turler,
                    'oyuncular': oyuncular,
                    'afis_url': afis_url
                }
    return None

@bot.tree.command(name="film", description="Rastgele bir film önerisi al")
async def film_onerisi(interaction: discord.Interaction):
    try:
        await interaction.response.defer()
        film = rasgele_film_al()
        if film:
            embed = discord.Embed(
                title=film['baslik'],
                description=f"""
                **Film Konusu**\n> {film['konu']}

                **Puan**: {film['oylama_ortalamasi']}/10
                **Yayın Yılı**: {film['yayin_yili']}
                **Türler**: {film['turler']}
                **Oyuncular**: {film['oyuncular']}
                """,
                color=discord.Color.dark_blue(),
                url=f"https://www.imdb.com/title/{film['imdb_id']}/" if film['imdb_id'] != 'N/A' else None
            )
            embed.set_image(url=film['afis_url'])
            embed.set_footer(text="Veriler TMDb'den alınmıştır.")
            await interaction.followup.send(embed=embed)
        else:
            await interaction.followup.send("Film önerisi alırken bir hata oluştu.", ephemeral=True)
    except Exception as e:
        await interaction.followup.send(f"Hata oluştu: {str(e)}", ephemeral=True)

@bot.event
async def on_ready():
    print(f'Bot {bot.user} olarak giriş yaptı.')
    try:
        senkronize_edilenler = await bot.tree.sync()
        print(f"{len(senkronize_edilenler)} komut senkronize edildi")
    except Exception as e:
        print(f"Komutları senkronize ederken hata oluştu: {e}")

bot.run(TOKEN)
