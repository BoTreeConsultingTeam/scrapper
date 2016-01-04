require 'rubygems'
require 'mechanize'
require 'open-uri'
require 'pry'
require 'csv'
require 'phantomjs'
require 'zip'
# Phantomjs.path

class WebScraperController < ApplicationController
  after_action :delete_zip_file, only: :scraped_data
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

  def scrap

    @user_details = []
    @retweet = []
    # mechanize = Mechanize.new
    page_count = 0
    elements_per_page = 20
    time_to_scroll_once = 2.3
    default_time = 90
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

  def scraped_data
    respond_to do |format|
      # format.csv { send_data csv_data_for_home_page  }
      format.html
      format.zip { send_data File.read("#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data.zip")}
    end
  end

  def scrap_followers
    scrap
    puts "start fetching followers and following"
    session[:user_name_list] = params[:user_name_list]
    Thread.new { fetch_followers_of_users_and_scrap }
  end
  
  def assign_email
    session[:email] = params[:email]
  end

  def send_list_of_followers
    number_of_users = session[:user_name_list].split(',').count
    number_of_files = Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.csv"].count
    if number_of_files == (number_of_users+1)
      create_zip_file_and_send_email
      session[:message] = 'Mail is sent'
    end
  end

  private
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
    zipfile_name = "#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data.zip"
    puts folder, zipfile_name, input_filenames
    Zip::File.open(zipfile_name, Zip::File::CREATE) do |zipfile|
      input_filenames.each do |filename|
        # Two arguments:
        # - The name of the file as it will appear in the archive
        # - The original file, including the path to find it
        zipfile.add(filename.split('/').last, folder + '/' + filename.split('/').last)
      end
      zipfile.get_output_stream("myFile") { |os| os.write "myFile contains just this" }
    end
    # ZipFileGenerator.new(input_dir, output_file).write
    Rails.logger.debug '=====> Compressed'
    # ScrappedDataMailer.data_mailer(session[:email]).deliver_now

    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*csv"].each {|file| File.delete("#{file}") }
    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.html"].each {|file| File.delete("#{file}") }
  end

  def delete_zip_file
    sleep 5
    File.delete("#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data.zip")
  end
end
