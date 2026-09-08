import { Telegraf } from 'telegraf';
import { getPatternHistory } from './analyzer.js';

const bot = new Telegraf('8890158199:AAHRGJbPooy0zQvXTNxano3hx9MKra1-g4w');

async function handleCheckCommand(ctx, timeframe, csvFile) {
    await ctx.reply(`⏳ Đang phân tích pattern ${timeframe} real-time... Vui lòng chờ`);
    
    try {
        const statsHistory = await getPatternHistory(timeframe, csvFile);
        
        if (!statsHistory || statsHistory.length === 0) { 
            return ctx.reply(`❌ Không tìm thấy pattern nào phù hợp trong dữ liệu ${timeframe}`); 
        }

        let response = `📊 *KẾT QUẢ PHÂN TÍCH PATTERN ${timeframe.toUpperCase()}*\n\n`;

        statsHistory.forEach((item, index) => {
            const s = item.stats;
            let score = 0;
            if (s) {
                const denom = s.countUp + s.countDown;
                score = denom > 0 ? ((s.countUp - s.countDown) / denom) * 100 : 0;
            }

            response += `*${index + 1}. Độ dài ${item.length} nến:*\n`;
            response += `Pattern: \`${item.pattern}\`\n`;
            response += `Tổng số lần xuất hiện: ${item.totalMatches} lần\n`;

            if (s) {
                response += `📈 Nến kế tiếp: Up ${s.upPercent}% (${s.countUp}) | Down ${s.downPercent}% (${s.countDown})\n`;
                response += `📊 Score: ${score.toFixed(2)}%\n\n`;
            } else {
                response += `📈 Nến kế tiếp: Chưa có dữ liệu lịch sử\n\n`;
            }
        });

        if (response.length > 4096) {
            const chunks = response.match(/[\s\S]{1,4096}/g);
            for (const chunk of chunks) { 
                await ctx.replyWithMarkdown(chunk); 
            }
        } else {
            await ctx.replyWithMarkdown(response);
        }
    } catch (err) {
        console.error(err);
        await ctx.reply(`❌ Có lỗi xảy ra: ${err.message}`);
    }
}

bot.on('text', async (ctx) => {
    const message = ctx.message.text.toLowerCase().trim();

    if (message.startsWith('check1h') || message.startsWith('find1h')) {
        await handleCheckCommand(ctx, '1h', 'btc_1h_analysis.csv');
    }
    else if (message.startsWith('check4h') || message.startsWith('find4h')) {
        await handleCheckCommand(ctx, '4h', 'btc_4h_analysis.csv');
    }
    else if (message.startsWith('check1d') || message.startsWith('find1d')) {
        await handleCheckCommand(ctx, '1d', 'btc_1d_analysis.csv');
    }
});

bot.launch();
console.log('🤖 Telegram Bot đã khởi chạy...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));