import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import PptxGenJS from 'pptxgenjs'

interface SlideData {
  id: string
  title: string
  content: string
  htmlCode: string
}

interface GeneratePPTXRequest {
  slides: SlideData[]
  title?: string
}

export async function POST(request: NextRequest) {
  try {
    const { slides, title = 'Generated Presentation' }: GeneratePPTXRequest = await request.json()

    if (!slides || slides.length === 0) {
      return NextResponse.json({ error: '没有幻灯片数据' }, { status: 400 })
    }

    // 启动Puppeteer浏览器
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // 设置页面尺寸为标准PPT尺寸（16:9），提高分辨率
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 2  // 提高分辨率，避免模糊
    })

    // 创建PPTX实例
    const pptx = new PptxGenJS()
    pptx.author = 'LocalSite AI'
    pptx.company = 'LocalSite'
    pptx.title = title

    // 为每个幻灯片生成截图并添加到PPTX
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      
      try {
   

        // 设置页面内容
        await page.setContent(slide.htmlCode )

        // 等待页面完全加载

        // 截图 - 使用更高质量的设置
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: false,
          omitBackground: true,  // 透明背景，避免白色边框
          clip: {
            x: 0,
            y: 0,
            width: 1280,
            height: 720
          }
        })

        // 将截图转换为base64
        const base64Image = `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`

        // 创建新的幻灯片并添加图片
        const pptxSlide = pptx.addSlide()
        
        // 设置幻灯片背景为透明
        pptxSlide.background = { color: 'FFFFFF' }
        
        pptxSlide.addImage({
          data: base64Image,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%'
        })

        console.log(`已处理幻灯片 ${i + 1}/${slides.length}: ${slide.title}`)
      } catch (error) {
        console.error(`处理幻灯片 ${i + 1} 时出错:`, error)
        // 如果单个幻灯片失败，创建一个错误提示幻灯片
        const errorSlide = pptx.addSlide()
        errorSlide.addText(`幻灯片 ${i + 1} 生成失败\n${slide.title}`, {
          x: 1,
          y: 1,
          w: 8,
          h: 4,
          fontSize: 24,
          color: 'FF0000',
          align: 'center',
          valign: 'middle'
        })
      }
    }

    // 关闭浏览器
    await browser.close()

    // 生成PPTX文件
    const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer

    // 返回PPTX文件
    return new NextResponse(pptxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.pptx"`,
        'Content-Length': pptxBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('生成PPTX时出错:', error)
    return NextResponse.json({ 
      error: '生成PPTX失败', 
      details: error instanceof Error ? error.message : '未知错误' 
    }, { status: 500 })
  }
} 