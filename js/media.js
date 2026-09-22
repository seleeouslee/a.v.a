// Wikipedia image and Dailymotion video search.

async function fetchMedia(query) {
    const mediaWindow = document.getElementById('media-window');
    const imageGrid = document.getElementById('media-images');
    const videoSlot = document.getElementById('media-video');

    mediaWindow.style.display = 'flex';
    imageGrid.innerHTML = 'SCANNING ARCHIVES...';
    videoSlot.innerHTML = 'ESTABLISHING VIDEO FEED...';

    try {
        const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&prop=pageimages&pithumbsize=400&format=json&origin=*`);
        const wikiData = await wikiRes.json();

        let imgHtml = '';
        if (wikiData.query && wikiData.query.pages) {
            const pages = Object.values(wikiData.query.pages);
            const images = pages.filter(p => p.thumbnail).slice(0, 4);
            if (images.length > 0) {
                images.forEach(img => {
                    imgHtml += `<img src="${img.thumbnail.source}" alt="${img.title}" style="width: 100%; height: 100%; object-fit: cover; border: 1px solid var(--hud-cyan); border-radius: 3px;">`;
                });
            } else {
                imgHtml = 'NO VISUALS FOUND IN WIKIPEDIA ARCHIVES.';
            }
        } else {
            imgHtml = 'NO VISUALS FOUND IN WIKIPEDIA ARCHIVES.';
        }

        imageGrid.innerHTML = imgHtml;
        imageGrid.style.display = 'grid';
        imageGrid.style.gridTemplateColumns = '1fr 1fr';
        imageGrid.style.gap = '10px';

        const dmRes = `https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&limit=1&fields=id,title`;
        const dmFetch = await fetch(dmRes);
        const dmData = await dmFetch.json();

        if (dmData.list && dmData.list.length > 0) {
            const videoId = dmData.list[0].id;
            videoSlot.innerHTML = `<iframe frameborder="0" width="100%" height="200" src="https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&mute=1" allowfullscreen allow="autoplay"></iframe>`;
        } else {
            videoSlot.innerHTML = 'NO VIDEO FEED AVAILABLE FOR THIS TARGET.';
        }

    } catch (err) {
        console.error(err);
        imageGrid.innerHTML = 'UPLINK ERROR. CONNECTION SEVERED.';
        videoSlot.innerHTML = 'UPLINK ERROR.';
    }
}
