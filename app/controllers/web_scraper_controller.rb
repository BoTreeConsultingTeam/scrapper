require 'rubygems'
require 'mechanize'
require 'open-uri'
require 'pry'
require 'csv'
require 'phantomjs'
require 'zip'
# Phantomjs.path

class WebScraperController < ApplicationController
  after_action :delete_zip_file, only: [:scraped_data, :scrapped_file]
  before_action :authentication, only: :new

  def new
    # reset_session
    # Dir.mkdir "#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data" rescue nil
  end

  def authentication
    reset_session
    if params[:authentication_key] == '11@2016'
      render "new"
    else
      render "authentication"
    end
  end

  def scraped_data
    respond_to do |format|
      # format.csv { send_data csv_data_for_home_page  }
      format.html
      format.zip { send_data File.read("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.zip")}
    end
  end

  def scrap_from_twitter
    session[:file] = 'scrapped_data.zip'
    scrap
    puts "start fetching followers and following"
    session[:user_name_list] = params[:user_name_list]
    Thread.new { fetch_followers_of_users_and_scrap }
  end
  
  def scrap_from_fb
    puts "Start fetching fb data"
    session[:file] = 'fb_profile.csv'
    session[:user_name_list] = params[:user_name_list]
    Thread.new {fetch_fb_data}
    redirect_to waiting_path
  end

  def waiting
    if File.exist?("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
      session[:message] = 'Ready to Download'
    end
  end
  
  def scrapped_file
    respond_to do|format|
      format.html
      format.csv {send_file "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}"}
      format.zip {send_file "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}"}
    end
  end

  def assign_email
    session[:email] = params[:email]
  end

  def send_list_of_followers
    number_of_users = session[:user_name_list].split(',').count
    number_of_files = Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.csv"].count
    if number_of_files == (number_of_users+1)
      create_zip_file_and_send_email
      session[:message] = 'Ready to Download'
      session[:file] = 'scrapped_data.zip'
    end
  end

  def youtube_scraper
    session[:file] = 'youtube_date.csv'
    Thread.new do
      params[:user_names].split(',').each_with_index do |user,index|
        yt_response = ''
        Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../../app/assets/javascripts/youtube_fetcher.js", user.try(:strip)){ |line| puts yt_response = line }
        yt_response = JSON.parse(yt_response)
        CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "a+") do |csv| 
          csv << ['User', yt_response.keys].flatten if index == 0
          csv << [user.try(:strip), yt_response.values].flatten
        end
      end
      File.rename("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
    end
    redirect_to waiting_path
  end

  def instagram_scraper
    session[:file] = 'instagram_data.csv'
    params[:user_names].split(',').each do |user|
      agent = Mechanize.new
      page = agent.get("https://www.instagram.com/#{user}/")
      element = agent.page.search("script")[6]
      text = element.content
      a = text.gsub('window._sharedData = ','').gsub(';','')
      b = JSON(a) 
      posts = b['entry_data']['ProfilePage'][0]['user']['media']['nodes']

      caption = []
      comments_count = []
      likes_count = []
      post_url = []
      is_video = []
      code = []
      video = []
      post_id = []

      posts.each do |post|
        post_id << post['id']
        caption << post['caption']
        comments_count << post['comments']['count']
        likes_count << post['likes']['count']
        post_url << post['display_src']
        is_video << post['is_video']
        code << post['code']
        video << post['is_video']
      end

      video_link = []
        code.zip(video).each do |c,v|
          if v == true
            video_link << c
        end
      end

      posted_at = []
      code.each do |c|
        post_page = agent.get("https://www.instagram.com/p/#{c}/")
        element = agent.page.search("script")[6]
        text = element.content
        a1 = text.gsub('window._sharedData = ','').gsub(';','')
        b1 = JSON(a1) 
        date = b1['entry_data']['PostPage'][0]['media']['date']
        post_date = Date.strptime("#{date}", '%s')
        posted_at << post_date
      end

      video_url = []
      video_link.each do |url|
        video_page = agent.get("https://www.instagram.com/p/#{url}/")
        v_link = video_page.at('meta[property="og:video:secure_url"]')[:content]
        video_url << v_link
      end

      user_name = b['entry_data']['ProfilePage'][0]['user']['username']
      data = caption.zip(comments_count).zip(likes_count).zip(post_url).zip(is_video).zip(post_id).zip(posted_at).flatten
      new_data = data.each_slice(7).to_a

      latest_data = []
      new_data.each do |n|
          if n[4] == true
           n.delete_at(3)
          end
          latest_data << n
      end

      final = []
      index = 0
      latest_data.each do |ld|
        if ld.length == 6
          ld.insert(3,video_url[index])
          index += 1
        end
        final << ld
      end


      CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", 'a+',{:col_sep => "|"}) do |csv|

            
        csv << ["description","comments","likes","url","is_video","post_id","posted_at","username"]

        final.each do |d|

          d1 = d << user_name
          csv << d1
        end
      end
    end
    # Thread.new do
    #   params[:user_names].split(',').each_with_index do |user,index|
    #     ig_response = ''
    #     Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../../app/assets/javascripts/instagram_fetcher.js", user.try(:strip)){ |line| puts ig_response = line }
    #     ig_response = JSON.parse(ig_response)
    #     CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "a+") do |csv| 
    #       csv << ['User', ig_response.keys].flatten if index == 0
    #       csv << [user.try(:strip), ig_response.values].flatten
    #     end
    #   end
    #   File.rename("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
    # end
    File.rename("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
    redirect_to waiting_path
  end

  def pinterest_scraper
    session[:file] = 'pinterest_data.csv'
    params[:user_names].split(',').each do |user|
      m = Mechanize.new
      page = m.get("https://www.pinterest.com/#{user}/pins/")

      username = page.at('meta[property="og:title"]')[:content].gsub('(','').gsub(')','').split(' ').last
      
      pins_data = []
      page_data = page.search('.pinWrapper').to_a
      page_data.each do |pin|
        pin_data = []

          
          pin_data << pin.search('.pinImageActionButtonWrapper .pinHolder .pinUiImage .pinImg').to_a.first['src'] rescue pin_data ""
          pin_data << pin.search('.pinNavLink').to_a.first['href'] rescue pin_data << ""
          pin_data << pin.search('.pinMeta .pinDescription').to_a.first.children.text.try(:strip) rescue pin_data << ""
          pin_data << pin.search('.richPinMeta .richPinGridTitle').children.text.try(:strip) rescue pin_data << ""
          pin_data << pin.search('.richPinMeta .richPinGridAttributionTitle').children.text.try(:strip) rescue pin_data << ""
          pin_data << pin.search('.richPinMeta .richPinMetaLink').to_a.first['href'] rescue pin_data << ""

          pin_url = pin.search('.pinImageActionButtonWrapper .pinHolder a').to_a.first['href']
          pin_page = m.get("https://www.pinterest.com#{pin_url}")
          pin_data << pin_page.search('.commentDescriptionTimeAgoWrapper span.commentDescriptionTimeAgo').text rescue pin_data << ""
          pin_data << pin.search('.pinImageActionButtonWrapper .pinHolder a').to_a.first['href'].split('/').last rescue pin_data << ""

          pins_data << pin_data
      end
      CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", 'a+',{:col_sep => "|"}) do |csv|

            
        csv << ["pinImageUrl","pinOriginWebLink","pinDescription","pinRichMetaTitle","pinRichMetaFrom","pinRichMetaUrl","pin_at","post_id","username"]

        pins_data.each do |d|

          d1 = d << username
          csv << d1
        end
      end
    end
    File.rename("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
    redirect_to waiting_path
  end

  def twitter_scraper
    session[:file] = 'twitter_data.csv'
    params[:user_names].split(',').each do |user|
      m = Mechanize.new

      page1 = m.get("https://mobile.twitter.com/#{user}")

      tweets = page1.search('.tweet').to_a
      tweets_data = []
      tweets.each do |tweet|
        tweet_data = []
        tweet_data << tweet.search('.tweet-text').text.try(:strip) rescue tweet_data << ""
        tweet_data << tweet.search('.timestamp').text.try(:strip) rescue tweet_data << ""
        tweet_data << tweet.search('.fullname').text.try(:strip) rescue tweet_data << ""
        tweet_data << tweet.search('.username').text.try(:strip) rescue tweet_data << ""

        tweet_link = tweet.search('span.metadata a').first['href'] rescue ""
        tweet_page = m.get "https://mobile.twitter.com#{tweet_link}"
        tweet_data << tweet_page.search('div.media img').first['src'].gsub(':small','') rescue tweet_data << ""

        tweets_data << tweet_data
      end
      username = page1.search('div.username span.screen-name').text.try(:strip)

      CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", 'a+',{:col_sep => "|"}) do |csv|
            
        csv << ["Tweet-text","Tweet_at","Fullname","Username","media_url","username"]

        tweets_data.each do |d|

          d1 = d << username
          csv << d1
        end
      end
    end
    File.rename("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
    redirect_to waiting_path
  end

  def facebook_scraping
    session[:file] = 'facebook_data.csv'
    mechanize = Mechanize.new
    page = mechanize.get('https://m.facebook.com/')

    form = mechanize.page.form_with(:method => 'POST')
    form.email = "email"
    form.pass = "password"
    page = mechanize.submit(form)

    params[:user_names].split(',').each do |user|
      agent = mechanize.get("https://m.facebook.com/#{user}?v=timeline")

      posts = agent.search('div.ch').to_a
      posts_data = []
      posts.each do |post|
        post_data = []
        
        post_data << post.search('div.co span p').text rescue post_data << ""
        post_data << post.search('div.cp div.bo.bp abbr').text rescue post_data << ""
        post_url = post.search('div.cv .cw').first['href'] rescue post_data << ""
        post_page = mechanize.get "https://m.facebook.com#{post_url}" rescue ""
        post_data << post_page.search('img').to_a[1].attributes['src'].value rescue post_data << ""
        post_data << post.search('div.cl a').first['href'] rescue post_data << ""

        posts_data << post_data
      end

      CSV.open("#{File.expand_path(File.dirname(__FILE__))}/#{user}_facebook.csv", 'a+',{:col_sep => "|"}) do |csv|
        csv << ["post_content","post_at","post_media_url","post_web_url"]

        posts_data.each do|p|
          csv << p
        end
      end
    end
  end

  def vine_scraper
    session[:file] = 'vine_data.zip'
    Thread.new do
      params[:user_names].split(',').each do |user|
        mechanize = Mechanize.new
        page = mechanize.get(" https://vine.co/api/users/profiles/vanity/#{user}")

        body = page.body
        d = JSON.parse(body)

        username = d['data']['username']
        userid = d['data']['userId']
        description = d['data']['description']
        followers = d['data']['followerCount']
        following = d['data']['followingCount']
        posts = d['data']['postCount']
        likes = d['data']['likeCount']
        loops = d['data']['loopCount']

        CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_vine.csv", 'a+') do |csv|
          csv << ['username','userid','description','followers','following','posts','likes','loops']
          csv << [username,userid,description,followers,following,posts,likes,loops]
          csv << [""]
          csv << [""]
          csv << [""]
        end

        description = []
        likes = []
        comments = []
        reposts = []
        loops = []
        u = ""

        page_no = 2
        anchor = 0
        
        url = "https://vine.co/api/timelines/users/#{userid}"
        page_posts = mechanize.get(url);
        body = page_posts.body
        parsed_body = JSON.parse(body)
        total_posts_count = parsed_body['data']['count']
        total_posts_count = (total_posts_count / 10) + 1

        1.upto total_posts_count do |i|

          url_page = "https://vine.co/api/timelines/users/#{userid}?page=#{page_no}&anchor=#{anchor}&size=10"

          if i == 1
            u = url
          else
            u = url_page
            page_no = page_no + 1
          end

          page = mechanize.get(u);

          body = page.body
          parsed_body = JSON.parse(body)
          a = parsed_body['data']['records']

          a.each do |values|
        
            description << values['description']
            likes << values['likes']['count']
            comments << values['comments']['count']
            reposts << values['reposts']['count']
            loops << values['loops']['count']
          end
          anchor = parsed_body['data']['anchor']
        end
          
        list = description.zip(likes).zip(comments).zip(reposts).zip(loops).flatten
        new_list = list.each_slice(5).to_a

        CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_vine.csv", 'a+') do |csv|
          
          csv << ["description","likes","comments","reposts","loops"]

          new_list.each do |v|

            csv << v 
          end
        end
      end
      create_zip_file_and_send_email
      # zipfile
    end
    redirect_to waiting_path
  end

  def scrap_db_fan_page
    session[:file] = 'fb_fan_details.csv'
    session[:user_name_list] = params[:user_name_list]
    Thread.new{fetch_fb_fan_page_data}
    redirect_to waiting_path
  end

  private

  def fetch_fb_fan_page_data
    fb_response = ''
    Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../../app/assets/javascripts/facebook_fan_page_fetcher.js", params[:user_name_list], ENV['FB_USER_NAME'], ENV['FB_PASSWD']) {|line| puts fb_response = line}
    binding.pry
    fan_page_data = fb_response.gsub("\"",'').split(/}\s*,\s*{/).map{|s| Hash[s.scan(/(\w+):\s*(\d+|\w+)/).map{|t| [t[0], t[1]]}]}
    CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", 'a+') do |csv|
      fan_page_data.each_with_index do |details, index|
        csv << [ details.keys].flatten if index == 0
        csv << [ details.values].flatten
      end
    end
    File.rename("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}.csv", "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
  end

  def fetch_fb_data
    puts "Starting for #{user}"
    Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../../app/assets/javascripts/facebook_fetcher.js", params[:user_name_list], ENV['FB_USER_NAME'], ENV['FB_PASSWD']) {|line| puts response = line}
    puts "HTML files are created"
    user_profile_data = []
    user_photos = []
    
    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*_profile.html"].each_with_index do |file, index|
      profile_data = File.read(file)
      scrap_data = Nokogiri::HTML(profile_data)
      posts = scrap_data.search('article.async_like').count
      likes = scrap_data.search('span.like_def._28wy').map(&:text).inject {|total_likes, like| total_likes.to_i + like.split('Like').first.to_i}
      comments = scrap_data.search('span.cmt_def._28wy').map(&:text).inject {|total_comments, comment| total_comments.to_i + comment.split('Comments').first.to_i}
      shares = scrap_data.search('span._28wy').map(&:text).inject {|share_count, share| share_count.to_i + share.split('Shares').first.to_i}
      friends = scrap_data.search('span._52je._52j9').children.text
      total_friends_count = friends.include?('(') ? friends.split('(').first : friends.include?('friends') ? '' : friends.match(/\d+/)[0]
      mutual_firends = friends.include?('(') ? friends.split('(').last.split('Mutual').first : friends.include?('friends') ? friends.match(/\d+/)[0] : ''
      user_profile_data << [file.split('fb_').last.split('_profile').first, posts, likes, comments, shares, total_friends_count, mutual_firends]
    end

    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*_photos.html"].each_with_index do |file, index|
      profile_data = File.read(file)
      scrap_data = Nokogiri::HTML(profile_data)
      
      posts = scrap_data.search('span a._39pi._4dvp').count
      user_photos << [posts]
    end

    user_profile_data = user_profile_data.zip(user_photos)
    CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}", 'a+') do |csv|
      csv << ['UserName', 'Posts', 'Likes', 'Comments', 'Shares', 'total_firends', 'mutual_firends', 'photos']
      user_profile_data.each {|details| csv << details.flatten }
    end
    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.html"].each {|file| File.delete("#{file}") }
  end

  def csv_data_for_home_page
    CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../profile.csv", 'a+') do |csv|
      csv << ['Name', 'Description', 'Tweets', 'Following', 'Followers', 'Likes', 'Location', 'Profile Pic URL','Retweet']
      session[:details].each do |item|
        csv << item.flatten
      end
    end
  end

  def csv_data_for_followers
    CSV.generate do |csv|
      csv << ['']
      session[:details].each do |item|
        csv << item
      end
    end
  end

  def fetch_followers_of_users_and_scrap
    params[:user_name_list].split(',').each do |user|
      user = user.strip
      puts "Starting for #{user}"

      Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../../app/assets/javascripts/twitter_fetcher.js", user.try(:strip), ENV['TTR_USER_NAME'], ENV['TTR_PASSWD'])
      puts "HTML files are created"
      folowers_file = File.read("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_followers.html")
      folowing_file = File.read("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_following.html")
      tweets_file = File.read("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_tweets.html")
      
      folowers_page = Nokogiri::HTML(folowers_file)
      folowing_page = Nokogiri::HTML(folowing_file)
      tweets_page = Nokogiri::HTML(tweets_file)

      folowers_fullname = folowers_page.search('.fullname').map(&:text)
      folowers_username = folowers_page.search('.username').map(&:text)

      folowing_fullname = folowing_page.search('.fullname').map(&:text)
      folowing_username = folowing_page.search('.username').map(&:text)

      retweet_count = tweets_page.search('.tweet-social-context').map(&:text).count
      @retweet << [retweet_count] 
      # tweet_fullname = tweets_page.search('.fullname').map(&:text)
      # tweet_username = tweets_page.search('.username').map(&:text)
      # tweet_text = tweets_page.search('.tweet-text').map(&:text)

      followers = folowers_fullname.zip(folowers_username)
      following = folowing_fullname.zip(folowing_username)
      # tweets = tweet_fullname.zip(tweet_username,tweet_text)
      # list = followers.zip(following)


      CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_followers.csv", 'a+') do |csv|
      csv << ['Follower full name', 'Follower user name']
      followers.each do |follower|
        csv << follower.flatten
      end
      csv << ["",""]
      csv << ["",""]
      csv << ['Following full name', 'Following user name']
      following.each do |follow|
        csv << follow.flatten
      end
      puts "CSV files of following and followers are created"
        # csv << ['Follower full name', 'Follower user name', "",'Following full name', 'Following user name']
        # list.each do |data|
        #   csv << data.flatten.insert(2, "")
        # end   
      end

      # CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_tweets.csv", 'a+') do |tweet_csv|
      #   tweet_csv << ['fullname','username','tweet text']
      #   tweets.each do |tweet|
      #     tweet_csv << tweet.flatten.map(&:strip)
      #   end
      #   puts "csv file for tweets are created"
      # end
      puts "Stop for #{user}"
    end
    session[:details] = session[:details].zip(@retweet)
    session[:details].sort! {|a,b| a[4].to_i <=> b[4].to_i}
    csv_data_for_home_page
  end

  

  def create_zip_file_and_send_email
    Rails.logger.debug '=====> Start Compressing'
    sleep 15
    folder = "#{File.expand_path(File.dirname(__FILE__))}/../.."
    input_filenames = Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.csv"]
    zipfile_name = "#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}"
    puts folder, zipfile_name, input_filenames
    Zip::File.open(zipfile_name, Zip::File::CREATE) do |zipfile|
      input_filenames.each do |filename|
        # Two arguments:
        # - The name of the file as it will appear in the archive
        # - The original file, including the path to find it
        zipfile.add(filename.split('/').last, folder + '/' + filename.split('/').last)
      end
      # zipfile.get_output_stream("myFile") { |os| os.write "myFile contains just this" }
    end
    # ZipFileGenerator.new(input_dir, output_file).write
    Rails.logger.debug '=====> Compressed'
    # ScrappedDataMailer.data_mailer(session[:email]).deliver_now

    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*csv"].each {|file| File.delete("#{file}") }
    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.html"].each {|file| File.delete("#{file}") }
  end

  def scrap

    @user_details = []
    @retweet = []
    # mechanize = Mechanize.new
    page_count = 0
    elements_per_page = 20
    time_to_scroll_once = 2.4
    default_time = 120
    params[:user_name_list].split(',').each do |user_name|
      page = Nokogiri::HTML(open("https://twitter.com/#{user_name.try(:strip)}"))
      # page = mechanize.get('https://twitter.com/santosh4892')
      # Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../assets/javascripts/1.js")
      title = page.title
      about_user = page.search('p.ProfileHeaderCard-bio').text
      # @counts =  page.search('ul.ProfileNav-list li span.ProfileNav-label').children.map(&:text).zip(page.search('ul.ProfileNav-list li span.ProfileNav-value').children.map(&:text)).first(4)
      counts = page.search('ul.ProfileNav-list li span.ProfileNav-value').children.map(&:text).first(4)
      location = page.search('span.ProfileHeaderCard-locationText a').text
      profile_pic = page.search('img.ProfileAvatar-image @src').text
      counts[2] = counts[2].gsub(',', '')
      counts[1] = counts[1].gsub(',', '')
      counts[0] = counts[0].gsub(',', '')
      
      counts[1] = convert_to_int(1,counts)
      counts[2] = convert_to_int(2,counts)
      counts[0] = convert_to_int(0,counts)
      
      @user_details << [title, about_user, counts, location, profile_pic].flatten
      page_count += ( counts[1].to_i + counts[2].to_i + counts[0].to_i )
    end
    time_count = (page_count / elements_per_page).to_f * time_to_scroll_once
    session[:current_time] = Time.now.in_time_zone(params[:timezone])
    session[:download_time] = Time.now.in_time_zone(params[:timezone]) + time_count + default_time
    session[:time] = (time_count + 30).to_f + default_time
    puts session[:current_time]
    puts session[:time]
    # @user_details.sort! {|a,b| a[4].to_i <=> b[4].to_i}
    session[:details] = @user_details 
    puts "Profile is fetched..."
     # csv_data_for_home_page
  end

  def convert_to_int(index,counts)
    if counts[index].include?('More')
      return 0
    elsif counts[index].include?('K')
      return counts[index].to_f * 1000
    elsif counts[index].include?('M')
      return counts[index].to_f * 10_00_000
    else
      return counts[index]
    end
  end

  def delete_zip_file
    Thread.new do
      sleep 45
      File.delete("#{File.expand_path(File.dirname(__FILE__))}/../../#{session[:file]}")
    end
  end
end
