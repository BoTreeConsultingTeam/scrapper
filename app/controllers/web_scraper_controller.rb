require 'rubygems'
require 'mechanize'
require 'open-uri'
require 'pry'
require 'csv'
require 'phantomjs'
# Phantomjs.path

class WebScraperController < ApplicationController
  def scrap

    @user_details = []
    # mechanize = Mechanize.new
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
      if counts[2].include?('More')
        counts[2] = 0
      elsif counts[2].include?('K')
        counts[2] = counts[2].to_f * 1000
      elsif counts[2].include?('M')
        counts[2] = counts[2].to_f * 10_00_000
      end
      counts[2] = counts[2].to_i
      @user_details << [title, about_user, counts, location, profile_pic].flatten
    end
    @user_details.sort! {|a,b| a[4].to_i <=> b[4].to_i}
    session[:details] = @user_details
  end

  def scraped_data
    respond_to do |format|
      format.csv { send_data csv_data  }
    end
  end

  def csv_data
    CSV.generate do |csv|
      csv << ['Name', 'Description', 'Tweets', 'Following', 'Followers', 'Likes', 'Location', 'Profile Pic URL']
      session[:details].each do |item|
        csv << item
      end
    end
  end
end
