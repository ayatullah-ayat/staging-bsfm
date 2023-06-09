const APP_URL = window.location.origin;

$(document).ready(function(){
    $(document).on('click', '.openCartModal', openAddToCartModal);
    $(document).on('click', '.removeFromCart', removeFromCart)
    $(document).on('click', '.removeFromCheckout', removeFromCartAndCheckout)
    $(document).on('click', '.alreadyInCart', alreadyInCart)
    $(document).on('click', '.cartstateChange', incrementDecrementCount)
})


function alreadyInCart(){
    alert('Already In Cart')
    return false;
}

function openAddToCartModal(e){
    let 
    elem        = $(this),
    id          = elem.attr('data-productid');
    let isOrderNow     = elem.attr('data-isordernow') && Number(elem.attr('data-isordernow')) == 1 ? true : false;

    displayVariants(id, isOrderNow);
    
}

function clearVariants(){
    $('.cart_color_container').empty();
    $('.cart_size_container').empty();
}

function displayVariants(product_id, isOrderNow){
    clearVariants();
    $.ajax({
        type: 'get',
        url: APP_URL + '/product/get-variants?product_id=' + product_id,
        success: function(res) {
            let colors = res.colors;
            let sizes = res.sizes;
            let product = res.product;
            let colorHtml = '';
            let sizeHtml = '';

            $('.product-cart-description').text(product.product_name);
            $('.product-cart-image').attr('src', APP_URL + '/' + product.product_thumbnail_image);
            colors.forEach((color, index) => {
                colorHtml += `
                        <div type="button" 
                            data-color="${color.color_name  ?? ''}" 
                            class="col-md-2 col-1 color ${color.color_name == 'White' ? 'black' : ''}" style="background-color: ${color.color_name }; ${color.color_name == 'White' ? 'box-shadow: 0px 0px 2px #000;': '' }"> 
                            <i class="fa-solid fa-check"></i>
                        </div>
                        `;
            });



            sizes.forEach((size, index) => {
                sizeHtml += `
                        <div type="button" 
                            data-size="${size.size_name  ?? ''}" 
                            class="col-md-2 col-1 size"> 
                            <span>${size.size_name  ?? ''}</span>
                        </div>
                `;
            });
            $('.cart_color_container').append(colorHtml);
            $('.cart_size_container').append(sizeHtml);
            if(isOrderNow){
                $('.addToCart').text('Order Now')
                $('.addToCart').attr('data-ordernow', 1);
                $('.addToCart').attr('data-cartproduct-id', product_id);
            }else{
                $('.addToCart').text('Add to Cart');
                $('.addToCart').attr('data-cartproduct-id', product_id);
            }
            $('#addToCartModal').modal('show');

        },
        error: function(err){
            console.log(err);
            alert(err)
        }
    })
}

// console.log(APP_URL);

function removeFromCart(e) {

    let
    elem        = $(this),
    id          = elem.attr('data-productid'),
    cartBadge   = $('.cartvalue'),
    cartTbody   = $('.cart-tbody'),
    currentTr   = $(document).find(`tr[data-productid="${id}"]`),
    checkoutBtnSection = $('.cart-checkout-footer');

    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        type: "post",
        url: APP_URL + '/remove-from-cart',
        data: { productId: id },
        dataType: 'html',
        cache: false,
        success: function (items) {

            if (items){

                currentTr.remove();

                if (cartTbody.find(`tr[data-productid]`).length < 1){

                    cartTbody.html(`<tr><td colspan="4">
                                <div class="w-100 alert alert-danger text-center">
                                   <h5>Your cart is Empty</h5>
                                </div>
                            </td></tr>`);

                    checkoutBtnSection.html(`<td colspan="2"></td>
                            <td colspan="2">
                                <a href="${checkoutBtnSection.attr('data-shopuri')}" class="btn btn-danger btn-sm text-decoration-none text-white w-100">কেনাকাটা করুন</a>
                            </td>`);

                    $('.grandTotalSection').remove();
                }

            }


            let products = JSON.parse(items);
            if (!Array.isArray(products)) {
                products = Object.entries(products);
            }

            cartBadge.html(products.length || 0);

            cartOverview();

        },
        error: function (xhr, status, error) {
            console.log("An AJAX error occured: " + status + "\nError: " + error);
        }
    });


} 


function incrementDecrementCount(e) {
    let
    elem        = $(this),
    countElem   = elem.closest('tr').find('.count'),
    ref         = elem.attr('data-increment-type'),
    count       = Number(countElem.text() ?? 0),
    pattern1    = /(plus|increment|increament)/im,
    pattern2    = /(minus|decrement|decreament)/im,
    minCount    = Number(countElem?.attr('data-min') ?? 1),
    maxCount    = Number(countElem?.attr('data-max') ?? 10),
    price       = Number(elem.closest('tr').find('.Sale_Price').attr('data-salesprice') ?? 0);

    if (pattern1.test(ref)) {

        count++;
        if (count > maxCount) count = maxCount;

    } else if (pattern2.test(ref)) {

        count--;
        if (count < minCount) count = minCount;
    }


    countElem.text(count);

    priceCalculation((price * count), elem.closest('tr').find('.subtotal'))

}



function priceCalculation(price, target) {

    let pattern = /^[+-]?\d+(\.\d+)$/im;
    if (pattern.test(price)) {
        price = price.toFixed(3);
    }

    target.text(price);

    cartOverview();

}



function cartOverview() {
    let
    pattern         = /^[+-]?\d+(\.\d+)$/im,
    totalProduct    = 0,
    grandTotal      = 0,
    rows            = $(document).find('.cart-items-details table').find(`tr[data-productid]`),
    cartItemsQty    = [];

    [...rows].forEach(row => {
        let product_id= $(row).find('.count').attr('data-productid');
        let color = $(row).find('.product-color').attr('data-color');
        let size = $(row).find('.product-size').attr('data-size');
        let itemCount = Number($(row).find('.count').text() ?? 0);
        let itemPrice = Number($(row).find('.Sale_Price').attr('data-salesprice') ?? 0);
        totalProduct += itemPrice * itemCount;
        let cartQtyObj = { product_id, qty: itemCount, color, size };
        cartItemsQty.push(cartQtyObj);
    })


    // console.log(cartItemsQty,'update-cart-qty');


    grandTotal = Number(totalProduct);

    if (pattern.test(totalProduct)) {
        grandTotal = grandTotal.toFixed(3)
    }

    $('#grandTotal').text(grandTotal);

    updateCartQty(cartItemsQty);

}




function removeFromCartAndCheckout(e) {

    let
        elem = $(this),
        id = elem.attr('data-productid'),
        cartBadge = $('.cartvalue'),
        cartTbody = $('.checkout-cart-tbody'),
        currentTr = $(document).find(`tr[data-productid="${id}"]`);

    
    if (cartTbody.find(`tr[data-productid]`).length <= 1) {
        alert('You can\'t delete This Product');
        return false;
    }


    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        type: "post",
        url: APP_URL + '/remove-from-cart',
        data: { productId: id },
        dataType: 'html',
        cache: false,
        success: function (items) {

            if (items) {
                currentTr.remove();
            }

            let products = JSON.parse(items);
            if (!Array.isArray(products)) {
                products = Object.entries(products);
            }

            cartBadge.html(products.length || 0);

            checkoutOverview();

        },
        error: function (xhr, status, error) {
            console.log("An AJAX error occured: " + status + "\nError: " + error);
        }
    });


}




function checkoutOverview() {
    let
        pattern = /^[+-]?\d+(\.\d+)$/im,
        totalProduct = 0,
        grandTotal = 0,
        cartItemsQty=[],
        disCountPrice = Number($('#discount').text() ?? 0),
        rows = $(document).find('.cart-items-details table').find(`tr[data-productid]`);

    [...rows].forEach(row => {
        let product_id = $(row).find('.count').attr('data-productid');
        let itemCount = Number($(row).find('.count').text() ?? 0);
        let itemPrice = Number($(row).find('.Sale_Price').attr('data-salesprice') ?? 0);
        totalProduct += itemPrice * itemCount;
        let cartQtyObj = { product_id, qty: itemCount};
        cartItemsQty.push(cartQtyObj);
    })


    grandTotal = Number(totalProduct) + Number(disCountPrice)

    if (pattern.test(totalProduct)) {
        totalProduct = totalProduct.toFixed(3);
        grandTotal = grandTotal.toFixed(3)
    }

    $('#producterdum').text(totalProduct);
    $('#surbomot').text(grandTotal);

    updateCartQty(cartItemsQty);
}




function updateCartQty(cartItemsQty) {
    $.ajax({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        type: "post",
        url: APP_URL + '/update-cart-qty',
        data: { cartQtys: cartItemsQty },
        dataType: 'html',
        cache: false,
        success: function (items) {
            console.log('item', items);
        },
        error: function (err) {
            console.log(err);
        }
    })
}